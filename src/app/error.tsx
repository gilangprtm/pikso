"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="screen grid place-items-center"><div className="empty-state"><h1>Ups, ada yang belum beres.</h1><p>Silakan coba lagi sebentar.</p><button className="button-primary mt-5" onClick={reset}>Coba lagi</button></div></main>; }
