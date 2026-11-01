"use client";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createCachedPdfSource } from "./pdf-range-source";
import { prefetchNextPages } from "./prefetch-pages";

// Version the URL so clients cannot reuse a cached standard worker after the repair.
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${pdfjs.version}-legacy`;
// Stable identity prevents React-PDF from starting a new loading task on progress updates.
const PDF_OPTIONS={rangeChunkSize:256*1024,disableStream:true,disableAutoFetch:true,disableRange:false};
type FlipHandle = { pageFlip: () => { flip: (page: number) => void } };
function PageLoading({number}:{number:number}) {
  return <div className="reader-page-placeholder" role="status"><div><LoaderCircle className="animate-spin mx-auto mb-3" aria-hidden="true"/><p>Menyiapkan halaman {number}…</p></div></div>;
}
function PreparedPage({number,width,onError,onReady}:{number:number;width:number;onError:()=>void;onReady:(number:number)=>void}) {
  const [rendered,setRendered]=useState(false);
  return <div style={{position:"relative",height:"100%"}}><Page suspense={false} pageNumber={number} width={width} devicePixelRatio={Math.min(window.devicePixelRatio||1,1.5)} renderTextLayer={false} renderAnnotationLayer={false} onLoadError={onError} onRenderError={onError} onRenderSuccess={()=>{setRendered(true);onReady(number);}} loading={null}/>{!rendered&&<div style={{position:"absolute",inset:0}}><PageLoading number={number}/></div>}</div>;
}
const Paper = forwardRef<HTMLDivElement, { number: number; width: number; height: number; active: boolean; onError: () => void; onReady: (number: number) => void }>(function Paper({number,width,height,active,onError,onReady},ref) {
  return <div ref={ref} className="reader-page" style={{width,height}} aria-label={`Halaman ${number}`}>{active ? <PreparedPage key={`${number}-${width}-${height}`} number={number} width={width} onError={onError} onReady={onReady}/> : <PageLoading number={number}/>}</div>;
});
export function Flipbook({ fileUrl, title, pageCount, backHref = "/books", adminPreview = false }: { fileUrl: string; title: string; pageCount: number; backHref?: string; adminPreview?: boolean }) {
  const ReaderButton = adminPreview ? Button : "button";
  const flipRef = useRef<FlipHandle>(null);
  const [count,setCount] = useState(0);
  const [page,setPage] = useState(0);
  const [error,setError] = useState("");
  const [dimensions,setDimensions] = useState({width:300,height:420});
  const [ratio,setRatio] = useState(0.707);
  const [zoom,setZoom] = useState(1);
  const [reduced,setReduced] = useState(false);
  const [progress,setProgress] = useState({loaded:0,total:0});
  const [cachedSource,setCachedSource] = useState<Awaited<ReturnType<typeof createCachedPdfSource>>|null>(null);
  const pdfRef = useRef<PDFDocumentProxy|null>(null);
  const readyPages = useRef(new Set<number>());
  const [renderVersion,setRenderVersion] = useState(0);
  const onReady=useCallback((number:number)=>{
    if(!readyPages.current.has(number)){readyPages.current.add(number);setRenderVersion(version=>version+1);}
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    let source:Awaited<ReturnType<typeof createCachedPdfSource>>|undefined;
    if(!adminPreview){
      createCachedPdfSource(fileUrl,{signal:controller.signal,onProgress:(loaded,total)=>{if(!controller.signal.aborted)setProgress({loaded,total});},onError:()=>{if(!controller.signal.aborted)setError("File buku tidak dapat dimuat. Silakan coba buka PDF langsung.");}}).then(next=>{
        source=next;
        if(controller.signal.aborted){next.range.abort();return;}
        setProgress({loaded:0,total:next.length});setCachedSource(next);
      }).catch(()=>{if(!controller.signal.aborted)setError("File buku tidak dapat dimuat. Silakan coba buka PDF langsung.");});
    }else{
      // Admin previews never read or write the persistent public cache.
      fetch(fileUrl,{method:"HEAD",cache:"no-store",signal:controller.signal}).then(response=>{
        const total=Number(response.headers.get("content-length"));
        if(response.ok&&Number.isSafeInteger(total)&&total>0)setProgress(previous=>({...previous,total}));
      }).catch(()=>{});
    }
    return()=>{controller.abort();source?.range.abort();};
  },[fileUrl,adminPreview]);
  const onProgress=useCallback(({loaded,total}:{loaded:number;total:number})=>{
    if(Number.isFinite(loaded)&&loaded>=0)setProgress(previous=>({loaded,total:Number.isFinite(total)&&total>0?total:previous.total}));
  },[]);
  useEffect(() => {
    const update=()=>{
      const width=Math.floor(Math.min(window.innerWidth-32,(window.innerHeight-125)*ratio,650));
      setDimensions({width:Math.max(90,width),height:Math.max(90,Math.floor(width/ratio))});
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setZoom(1);setPage(0);
    };
    update();window.addEventListener("resize",update);return()=>window.removeEventListener("resize",update);
  },[ratio]);
  const onLoad=useCallback(async(pdf:PDFDocumentProxy)=>{
    if(!pdf.numPages||pdf.numPages>500){setError("Jumlah halaman buku tidak valid.");return;}
    try {
      const first=await pdf.getPage(1);const viewport=first.getViewport({scale:1});
      if(!Number.isFinite(viewport.width)||!Number.isFinite(viewport.height)||viewport.width<=0||viewport.height<=0){throw new Error("Invalid page dimensions");}
      setRatio(viewport.width/viewport.height);setCount(pdf.numPages);pdfRef.current=pdf;readyPages.current.clear();setError("");
    } catch {
      setError("Halaman buku tidak dapat dimuat. Silakan coba buka PDF langsung.");
    }
  },[]);
  const onPageError=useCallback(()=>setError("Halaman buku tidak dapat ditampilkan. Silakan coba buka PDF langsung."),[]);
  const step=1;
  const last=count===1?0:Math.floor((count-1)/step)*step;
  useEffect(()=>{
    const pdf=pdfRef.current;
    if(!pdf||!readyPages.current.has(page+1))return;
    const controller=new AbortController();
    void prefetchNextPages(pdf,page+1,controller.signal);
    return()=>controller.abort();
  },[page,count,renderVersion]);
  const go=useCallback((next:number)=>{
    const target=Math.max(0,Math.min(last,next));
    flipRef.current?.pageFlip().flip(target);setPage(target);setZoom(1);
  },[last]);
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if(event.key==="ArrowRight"){event.preventDefault();go(page+step);}
      if(event.key==="ArrowLeft"){event.preventDefault();go(page-step);}
    };
    window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);
  },[page,step,go]);
  const percent=progress.total?Math.min(100,Math.floor(progress.loaded/progress.total*100)):null;
  const loading=<div className="reader-loader" role="status"><LoaderCircle size={24} className="animate-spin mx-auto mb-3"/><p>{percent===null?"Menyiapkan halaman cerita…":`Memuat cerita… ${percent}%`}</p><p className="mt-2">Halaman dibaca bertahap, tanpa menunggu seluruh buku.</p></div>;
  return <main className="reader-screen">
    <header className="reader-header">{adminPreview ? <Button nativeButton={false} variant="ghost" render={<Link href={backHref}/>} className="reader-back"><ArrowLeft size={17}/><span>Rak cerita</span></Button> : <Link className="reader-back" href={backHref}><ArrowLeft size={17}/><span>Rak cerita</span></Link>}<h1>{title}</h1><div className="reader-controls"><ReaderButton type="button" className="reader-button" aria-label="Perkecil halaman" disabled={zoom===1} onClick={()=>setZoom(z=>Math.max(1,z-.25))}><Minus size={15}/></ReaderButton><ReaderButton type="button" className="reader-button" aria-label="Perbesar halaman" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}><Plus size={15}/></ReaderButton></div></header>
    <section className={`reader-stage ${zoom>1?"reader-zoomed":""}`} aria-label="Pembaca buku digital">
      {error?<div className="reader-error" role="alert"><h2>Buku belum bisa dibuka.</h2><p>{error}</p><a className="button-primary my-4" href={fileUrl} target="_blank" rel="noopener noreferrer">Buka PDF langsung</a><br/>{adminPreview ? <Button nativeButton={false} variant="link" render={<Link href={backHref}/>}>Kembali ke rak cerita</Button> : <Link href={backHref}>Kembali ke rak cerita</Link>}</div>:!adminPreview&&!cachedSource?loading:<Document key={fileUrl} suspense={false} file={adminPreview?fileUrl:cachedSource!} options={PDF_OPTIONS} onLoadProgress={onProgress} onLoadSuccess={onLoad} onSourceError={()=>setError("Sumber PDF tidak dapat dimuat. Silakan coba buka PDF langsung.")} onLoadError={()=>setError("File buku tidak dapat dimuat. Silakan coba buka PDF langsung.")} loading={loading} error={null}>
        {count===0?loading:<div style={{zoom}}>{count===1?<div className="reader-book" style={{width:dimensions.width,height:dimensions.height}}><Paper number={1} width={dimensions.width} height={dimensions.height} active onError={onPageError} onReady={onReady}/></div>:<HTMLFlipBook key={`${dimensions.width}-${dimensions.height}`} ref={flipRef} className="reader-book" style={{width:dimensions.width,height:dimensions.height}} width={dimensions.width} height={dimensions.height} size="fixed" minWidth={90} maxWidth={1300} minHeight={90} maxHeight={1500} maxShadowOpacity={0.28} showCover={false} mobileScrollSupport={false} usePortrait startPage={0} startZIndex={0} drawShadow autoSize={false} clickEventForward useMouseEvents swipeDistance={30} showPageCorners={!reduced} disableFlipByClick={false} onFlip={event=>{setPage(event.data);setZoom(1);}} flippingTime={reduced?1:650}>
          {Array.from({length:count},(_,index)=><Paper key={index} number={index+1} width={dimensions.width} height={dimensions.height} active={index>=Math.max(0,page-1)&&index<=page+1} onError={onPageError} onReady={onReady}/>)}
        </HTMLFlipBook>}</div>}
      </Document>}
    </section>
    <footer className="reader-nav"><ReaderButton type="button" className="reader-button" aria-label="Halaman sebelumnya" disabled={!count||page<=0} onClick={()=>go(page-step)}><ChevronLeft size={18}/></ReaderButton><div aria-live="polite" className="text-center"><span>{count?`${page+1}`:"—"} / {count||pageCount}</span><p className="mt-1 text-[9px] opacity-65">Geser halaman atau gunakan tombol panah</p></div><ReaderButton type="button" className="reader-button" aria-label="Halaman berikutnya" disabled={!count||page>=last} onClick={()=>go(page+step)}><ChevronRight size={18}/></ReaderButton></footer>
  </main>;
}
