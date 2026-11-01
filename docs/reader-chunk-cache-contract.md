# PIKSO-READER-CHUNK-CACHE/r1

## Full bounded contract

Execution direct_native; responsibility native_pi. Objective: implement Owner-requested reliable application-managed per-device cache for public PDF reopening, explain SSR vs interactive PDF, preserve percentage-only loading. Target `/mnt/storage/projects/nana-website`, baseline `uyXlV7IaRy-DAPt59I1VC`. Native workflow intake/classify/contract/execute/self_review/close/report. Governing KITAB status healthy, STD-023 resolved/read, project AGENTS and installed Next client/server guide inspected. Functional tests only; no browser/lifecycle/visual tooling. Standing verified build/restart port3000 authorization remains.

## Architecture decision: DESIGN_BOUNDED

Observed current architecture: server renders reader route/access/metadata, client-only React-PDF parses and renders canvas. Stable file version query; public published guard before HEAD/GET; helper serves correct bounded ranges/validators. Current browser-managed HTTP caching provides no guaranteed partial response reuse. Installed PDF.js exposes documented PDFDataRangeTransport and React-PDF accepts stable `{range}` objects. Consumers public reader and protected admin preview, with deliberately different cache semantics.

Options: (1) longer HTTP freshness: small but does not ensure partial storage and weakens revocation; rejected. (2) whole-file cache: simpler but transfers 31MiB before first-page readiness or needs separate idle download/memory; rejected. (3) public-only IndexedDB fixed256KiB byte chunks via PDF.js range transport: selected. Reuse public HEAD/ranges/validators/legacy renderer; no service worker/global fetch interception/server API change. Native storage implementation new because repository has no persistent PDF chunk cache; canonical transport owner `src/components/reader/pdf-range-source.ts` with only Flipbook consumer. Test injected store/fetch and real PDF.js parser; IDB adapter functional callback tests, no simulated browser or React lifecycle.

## Scope / boundaries

Included: public cache helper and native IndexedDB adapter, stable Flipbook source initialization/abort/progress/error integration, focused/full functional tests, contract/result docs, full lint/typecheck/build and verified activation. Excluded: SSR PDF/image conversion, CDN/offline cache, pre-download entire book, protected/admin byte caching, PDF/book/status/cover mutation, authorization policy changes, new dependencies, env/proxy/credentials/migration/commit/push. Cache is app-managed public bytes with mandatory online HEAD every open, not offline access. Existing active reader revocation semantics unchanged (same as bytes already received); every missing range still guarded server-side. Cached bytes remain local and origin-bound, not an encryption/access-control boundary.

## Cache contract / acceptance

1. Fresh no-store HEAD to unchanged public endpoint before any persistent store read; published/access failure denies loading even with warm cache. Strict PDF length<=50MiB and strong ETag required.
2. Fixed256KiB chunks keyed by stable public URL+ETag+offset; cached chunks length/version checked. Only misses fetch exact Range+If-Range; require206+matching ETag/Content-Range/type/length; changed/revoked/error response fails locally with no blind retry/full download. Never mix versions.
3. Persistent IndexedDB with bounded64MiB origin cache,7-day expiry and oldest-used eviction; prune superseded versions for same public resource. No localStorage bytes/credentials. Quota/unavailable/blocked storage degrades to network-only reading, not a broken reader.
4. PDF.js documented transport returns copies so worker transfer cannot detach persisted/in-flight shared buffers. Abort/cancellation cleanly stops outstanding fetches, no automatic retry loop/unhandled rejections.
5. Admin preview bypasses helper/storage entirely, keeps original protected URL/no-store; existing error recovery and demand rendering/DPR maintained. Percentage text only, no progress bar/MB. Progress counts available bytes (including cache), not network-only or readiness guarantee.
6. Functional proof: cold real reference PDF first-page operators with partial transfer, fresh warm transport same persistent test store performs HEAD only and zero PDF GET bytes for same first-page operators; changed ETag refetches; access denial never reads cache; bad range/storage failure/cancel bounded; adapter transactions/eviction checked without browser tools. Actual Safari reload persistence/speed/canvas remain unknown until Owner checks.
7. Full tests/lint/types/build PASS, final diff self_review, actual listener cwd/cmd/socket verified before standing-authorized activation. Record latest build/live routes without device claims.

Next decision boundary: stop for auth/persistence scope expansion, original PDF conversion, below-supported-iOS compatibility, migration or unknown activation outcomes. Explicit Owner instruction 'pokoknya harus ada sistem cache' authorizes this bounded cache implementation; no unrelated operation.
