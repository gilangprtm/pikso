type ProofStorage = Pick<Storage,"getItem"|"setItem"|"removeItem">;
export const storyAccessKey = (id:string) => `pikso-story-access:${id}`;
/** Only a signed bearer proof is retained; raw access codes never enter storage. */
export async function unlockStory(slug:string,id:string,code?:string, storage?:ProofStorage, fetcher:typeof fetch=fetch) {
  let store=storage;
  if (!store) try { store=localStorage; } catch {}
  let proof:string|null=null;
  if (code===undefined) try { proof=store?.getItem(storyAccessKey(id)) ?? null; } catch {}
  const response=await fetcher(`/api/books/${slug}/access`,{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",credentials:"same-origin",body:JSON.stringify(code===undefined?{proof}:{code})});
  const payload=await response.json();
  if (!response.ok) {
    if (response.status===403) try { store?.removeItem(storyAccessKey(id)); } catch {}
    throw new Error(typeof payload.error==="string"?payload.error:"Akses belum dapat diperiksa.");
  }
  if (typeof payload.proof==="string") try { store?.setItem(storyAccessKey(id),payload.proof); } catch {}
}
