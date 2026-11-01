"use client";
import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
const Reader=dynamic(()=>import("./flipbook").then(module=>module.Flipbook),{ssr:false,loading:()=> <main className="reader-screen grid place-items-center"><p className="text-sm">Menyiapkan buku…</p></main>});
type Props = { fileUrl:string;title:string;pageCount:number;backHref?:string;adminPreview?:boolean };
class ReaderErrorBoundary extends Component<{children:ReactNode;fileUrl:string;backHref:string}, {failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  render() {
    if(this.state.failed) return <main className="reader-screen grid place-items-center"><section className="reader-error" role="alert"><h1>Buku belum bisa dibuka.</h1><p>Terjadi kendala saat menyiapkan pembaca. Anda bisa mencoba lagi atau membuka file PDF langsung.</p><button className="button-primary my-4" onClick={()=>this.setState({failed:false})}>Coba lagi</button><br/><a className="button-primary my-2" href={this.props.fileUrl} target="_blank" rel="noopener noreferrer">Buka PDF langsung</a><br/><a href={this.props.backHref}>Kembali</a></section></main>;
    return this.props.children;
  }
}
export function ReaderLoader(props:Props){return <ReaderErrorBoundary key={props.fileUrl} fileUrl={props.fileUrl} backHref={props.backHref??"/books"}><Reader {...props}/></ReaderErrorBoundary>;}
