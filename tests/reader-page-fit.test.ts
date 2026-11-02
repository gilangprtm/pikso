import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import postcss from "postcss";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

type Element = { type: unknown; props: Record<string, unknown> };
const source = readFileSync("src/components/reader/flipbook.tsx", "utf8");

// Direct function/element-prop checks only; no DOM or React lifecycle simulation.
function readerTree(count: number, single: boolean, zoom: number) {
  const width = single ? 382 : 500;
  const values = [count, 0, "", { width, height: width, single }, 1, zoom, false, { loaded: 0, total: 0 }, null, 0];
  let state = 0;
  const element = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const modules: Record<string, unknown> = {
    react: {
      forwardRef: (fn: unknown) => fn,
      useCallback: (fn: unknown) => fn,
      useEffect: () => {},
      useRef: (value:unknown) => ({ current: value }),
      useState: () => [values[state++], () => {}],
    },
    "react/jsx-runtime": { jsx: element, jsxs: element },
    "react-pdf": { Document: "Document", Page: "Page", pdfjs: { version: "6.3.289", GlobalWorkerOptions: {} } },
    "react-pageflip": { default: "Flipbook" },
    "./pdf-range-source": {},
    "./prefetch-pages": {},
    "next/link": { default: "a" },
    "@/components/ui/button": { Button: "button" },
    "lucide-react": new Proxy({}, { get: (_, name) => String(name) }),
  };
  const exports: { Flipbook?: (props: unknown) => Element } = {};
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "exports", compiled)((name: string) => modules[name], exports);
  const root = exports.Flipbook!({ fileUrl: "/api/admin/books/id/file", title: "Book", pageCount: count, adminPreview: true });
  const stage = (root.props.children as Element[])[1];
  const document = stage.props.children as Element;
  const zoomWrapper = document.props.children as Element;
  const book = zoomWrapper.props.children as Element;
  return { zoomWrapper, book, width, stage };
}

test("reader displays one PDF-sized page on desktop and mobile under one shared zoom", () => {
  for (const count of [1, 15]) for (const zoom of [1, 1.25, 2]) {
    const { zoomWrapper, book, width } = readerTree(count, true, zoom);
    assert.deepEqual(zoomWrapper.props.style, { zoom });
    assert.deepEqual(book.props.style, { width, height: width });
    if (count > 1) {
      assert.equal(book.props.width, width);
      assert.equal(book.props.height, width);
      assert.equal(book.props.autoSize, false);
      assert.equal(book.props.size, "fixed");
      assert.equal(book.props.usePortrait, true);
    }
    const paper = count === 1 ? book.props.children as Element : (book.props.children as Element[])[0];
    assert.equal(paper.props.width, width);
    assert.equal(paper.props.height, width);
    const rendered = (paper.type as (props: unknown, ref: unknown) => Element)({ ...paper.props, active: false }, null);
    assert.deepEqual(rendered.props.style, { width, height: width });
  }
  assert.match(source, /setDimensions\(\{width:Math\.max\(90,width\),height:Math\.max\(90,Math\.floor\(width\/ratio\)\)\}\)/);
  assert.doesNotMatch(source, /dimensions\.width\*2|dimensions\.width\*zoom|dimensions\.height\*zoom/);
});

test("reader CSS cannot independently squeeze the canvas width or impose a mobile paper height", () => {
  const css = postcss.parse(readFileSync("src/app/globals.css", "utf8"));
  css.walkRules(rule => {
    if (rule.selector === ".reader-book" || rule.selector === ".reader-page") {
      rule.walkDecls(declaration => {
        if (!(rule.selector === ".reader-page" && declaration.prop === "max-width" && declaration.value === "100%")) assert.ok(!["width", "height", "max-width", "max-height", "min-height", "min-width"].includes(declaration.prop), `${rule.selector}: ${declaration.toString()}`);
      });
    }
  });
  assert.match(source, /className="reader-page" style=\{\{width,height\}\}/);
  assert.match(source, /pageNumber=\{number\} width=\{width\}/);
});

test("reader contains viewport overflow and enables scrollbar-free panning only when zoomed", () => {
  const rules = new Map<string, Record<string,string>>();
  postcss.parse(readFileSync("src/app/globals.css", "utf8")).walkRules(rule => {
    if (rule.parent?.type !== "root") return;
    const declarations:Record<string,string> = {};
    rule.walkDecls(declaration => { declarations[declaration.prop] = declaration.value; });
    rules.set(rule.selector, declarations);
  });
  assert.equal(rules.get(".reader-screen")?.height, "100dvh");
  assert.equal(rules.get(".reader-screen")?.overflow, "hidden");
  const stage = rules.get(".reader-stage")!;
  assert.equal(stage.overflow, "hidden");
  assert.equal(stage["min-width"], "0");
  assert.equal(stage["min-height"], "0");
  assert.equal(stage.flex, "1");
  assert.equal(rules.get(".reader-stage.reader-zoomed")?.overflow, "auto");
  assert.equal(rules.get(".reader-stage.reader-zoomed")?.["scrollbar-width"], "none");
  assert.equal(rules.get(".reader-stage.reader-zoomed::-webkit-scrollbar")?.display, "none");
  for (const count of [1, 15]) for (const zoom of [1, 1.25, 2]) {
    assert.equal(String(readerTree(count, true, zoom).stage.props.className).includes("reader-zoomed"), zoom > 1);
  }
});

test("reference page five is square and native PDF rendering has no added bottom paper strip", async () => {
  const task = getDocument({ data: new Uint8Array(readFileSync("docs/reference/Nana dan Kerajaan di Atas Awan.pdf")) });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(5);
    const viewport = page.getViewport({ scale: 1 });
    assert.ok(Math.abs(viewport.width / viewport.height - 1) < 0.0001);
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    await page.render({ canvas: null, canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D, viewport }).promise;
    const bottom = canvas.getContext("2d").getImageData(0, canvas.height - 8, canvas.width, 8).data;
    let colored = 0;
    for (let i = 0; i < bottom.length; i += 4) if (bottom[i] < 245 || bottom[i + 1] < 245 || bottom[i + 2] < 245) colored++;
    assert.ok(colored > canvas.width * 4, "bottom eight rows retain PDF artwork");
  } finally { await task.destroy(); }
});
