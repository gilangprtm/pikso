import { test } from "node:test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import sharp from "sharp";
import { PDFDocument, rgb, degrees } from "pdf-lib";
import { createPdfCover } from "../src/lib/cover-upload";

test("automatic cover renders only page one as an undistorted square WebP", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 100]).drawRectangle({ x:0, y:0, width:200, height:100, color:rgb(1,0,0) });
  pdf.addPage([100, 200]).drawRectangle({ x:0, y:0, width:100, height:200, color:rgb(0,0,1) });
  const source = new Uint8Array(await pdf.save());
  const { cover, pageCount } = await createPdfCover(source);
  const image = sharp(cover);
  const metadata = await image.metadata();
  assert.equal(pageCount, 2);
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 900);
  assert.equal(metadata.height, 900);
  assert.equal(source[0], 37);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject:true });
  const pixel = (x:number,y:number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
  const center = pixel(450,450);
  assert.ok(center[0] > 230 && center[1] < 20 && center[2] < 20, "page one is red, not page two or a blank render");
  assert.ok(pixel(10,10).every(channel=>channel>245), "landscape padding stays white");
  assert.ok(pixel(10,450)[0]>230 && pixel(890,450)[0]>230, "left and right page edges remain present");
  assert.ok(pixel(450,215).every(channel=>channel>245));
  assert.ok(pixel(450,235)[1]<20 && pixel(450,665)[1]<20);
  assert.ok(pixel(450,685).every(channel=>channel>245), "2:1 content keeps its aspect ratio inside the square");
});

test("automatic cover handles portrait and rotated PDF pages without changing page count", async () => {
  for(const rotation of [0, 90]) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([100, 200]);
    page.setRotation(degrees(rotation));
    page.drawRectangle({x:0,y:0,width:100,height:200,color:rgb(0,0,1)});
    const {cover,pageCount}=await createPdfCover(await pdf.save());
    const metadata=await sharp(cover).metadata();
    assert.equal(pageCount,1);
    assert.equal(metadata.width,900);
    assert.equal(metadata.height,900);
    const {data,info}=await sharp(cover).raw().toBuffer({resolveWithObject:true});
    const offset=(450*info.width+450)*info.channels;
    assert.ok(data[offset]<20 && data[offset+1]<20 && data[offset+2]>230);
    const paddingOffset=(rotation===0 ? 450*info.width+10 : 10*info.width+450)*info.channels;
    assert.ok([...data.subarray(paddingOffset,paddingOffset+3)].every(channel=>channel>245));
  }
});

// Minimal Standard Security R2 PDF fixture; generated in memory, no external tool.
function encryptedPdf(password: string) {
  const padding = Buffer.from("28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a", "hex");
  const pad = (value: string) => Buffer.concat([Buffer.from(value), padding]).subarray(0, 32);
  const md5 = (value: Uint8Array) => createHash("md5").update(value).digest();
  const rc4 = (key: Uint8Array, bytes: Uint8Array) => {
    const state = Array.from({length:256}, (_, i) => i);
    let j = 0;
    for (let i = 0; i < 256; i++) { j = (j + state[i] + key[i % key.length]) & 255; [state[i], state[j]] = [state[j], state[i]]; }
    let i = 0; j = 0;
    return Buffer.from(bytes.map(byte => { i = (i + 1) & 255; j = (j + state[i]) & 255; [state[i], state[j]] = [state[j], state[i]]; return byte ^ state[(state[i] + state[j]) & 255]; }));
  };
  const owner = rc4(md5(pad("test-owner")).subarray(0, 5), pad(password));
  const id = Buffer.alloc(16, 1);
  const permissions = Buffer.alloc(4); permissions.writeInt32LE(-4);
  const key = md5(Buffer.concat([pad(password), owner, permissions, id])).subarray(0, 5);
  const user = rc4(key, padding);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> >>",
    `<< /Filter /Standard /V 1 /R 2 /O <${owner.toString("hex")}> /U <${user.toString("hex")}> /P -4 >>`,
  ];
  let source = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(source);
  source += "xref\n0 5\n0000000000 65535 f \n" + offsets.slice(1).map(offset => `${String(offset).padStart(10,"0")} 00000 n \n`).join("");
  source += `trailer\n<< /Size 5 /Root 1 0 R /Encrypt 4 0 R /ID [<${id.toString("hex")}> <${id.toString("hex")}>] >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(source));
}

test("single-pass PDF validation still rejects password and empty-password encryption", async () => {
  for (const password of ["", "test-password"]) {
    const source = encryptedPdf(password);
    await assert.rejects(PDFDocument.load(source), /encrypted/i);
    await assert.rejects(createPdfCover(source), password ? /password/i : /terenkripsi/);
  }
});

test("automatic cover rejects more than 500 pages and corrupt PDFs", async () => {
  const tooMany = await PDFDocument.create();
  for(let index=0;index<501;index++) tooMany.addPage([20,20]);
  await assert.rejects(createPdfCover(await tooMany.save()),/1–500 halaman/);
  await assert.rejects(createPdfCover(new Uint8Array([37,80,68,70,45,0,1,2])),Error);
});
