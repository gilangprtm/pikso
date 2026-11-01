# PIKSO-READER-PREFETCH/r1

## Contract
- Path: direct_native; level: full; responsibility: native_pi.
- Target: `/mnt/storage/projects/nana-website`; baseline active catalog build `9oQ1HM57XFTHW1miyZqc0` (runtime reverified before activation); no Git metadata.
- Objective: one visible PDF page on wide/mobile screens, loading during page preparation, and bounded sequential preparation of following pages while reading.
- Included: shared reader and focused functional regression tests. Excluded: original PDF/cover/status, database, API/auth contracts, cache policy, dependencies, environment, proxy, credentials, migrations, commits/pushes, browser tests.
- Acceptance: (1) one-page geometry with single-step navigation at all widths; (2) spinner until page canvas render completes, without a progress bar; (3) prepare at most two next pages sequentially after active page readiness without opening them or predownloading whole file; (4) preserve public authorization/chunk checks and admin no-store bypass; (5) full tests/lint/types/build and verified port-3000 activation under standing Owner authorization.
- Next boundary: device confirmation, not additional production data changes.

## Reuse / implementation
EXTEND_EXISTING `Flipbook`, React-PDF `Page` callbacks, PDF.js `getPage/getOperatorList`, and existing public range source; no second fetch/cache implementation. Installed Next.js client-component guide and page-flip fixed-size orientation calculation were inspected. Page-flip selects portrait when block width is less than twice the page width: its root is now always exactly one page wide, `usePortrait=true`, `autoSize=false`. Removed responsive spread sizing and double-step counter/navigation.

Added reader-local `prefetch-pages.ts` because no page-content prefetch helper existed: it owns only sequential two-page lookahead via the supplied document proxy, not transport/auth/persistence. Current and adjacent canvases remain bounded to previous/current/next, as before in single-page mode. Once the visible page is rendered, prefetch prepares the next two operator lists (including their PDF resources). PDF.js reuses these internally; the existing public source handles requested ranges/cache, admin remains nonpersistent. Built-in `disableAutoFetch=true` is intentionally retained to avoid automatic whole-file acquisition.

`PreparedPage` overlays a spinner until `onRenderSuccess`, including parsing and canvas rendering, rather than relying only on Page's document-load placeholder. Remount on page/dimensions/activation resets render readiness. Downloaded contents are not a guarantee of instantaneous canvas rendering.

On navigation/unmount, the lookahead signal stops scheduling additional pages. An already-started PDF.js operation cannot be individually aborted via its public API and may finish; reader teardown still aborts the transport. Optional prefetch errors are contained; existing foreground/source errors remain effective. No explicit retry loop.

## Evidence and self_review
Functional/source/element-property/Node PDF.js tests only; no browser, DOM, simulated React lifecycle, Safari rendering, or actual IndexedDB persistence claim.
- Real reference PDF: page-one content requested 2,500,598 bytes; after background preparation of pages 2 and 3, 6,957,046 of 32,647,158 bytes. Reading those operator lists again required zero additional range GETs. No future page canvas was opened/rendered by this test.
- Additional tests: sequential two-page bound, document end, pre-aborted signal, cancellation after in-flight content, optional error containment, one-page geometry/zoom, render-completion spinner wiring, cache/auth regression.
- Existing tests initially failed on old spread expectation and test harness refs initialized to null; updated expected contract and refs to preserve their supplied initial values. Not evidence of browser lifecycle verification.
- Review mode: self_review. Functional acceptance PASS when final checks complete; actual wide/mobile/Safari appearance and swipe performance remain unverified.

## Final checks / activation
- `npx tsx --test tests/reader-*.test.ts`: 23/23 focused reader tests passed before adding the real prefetch integration fixture.
- Final `npm test`: 74/74 passed, including real PDF.js/range prefetch fixture.
- `npm run lint`: passed; `npm run typecheck`: passed; final `npm run build`: passed, Next.js 16.4.3, build `YTPTKWgzFvFVw4o1NaG1j`.
- Re-read current implementation/tests and checked source selectors/semantics; no Git metadata exists in this workspace, so review was file/source/test based. `git diff --check` unavailable for the same reason.
- Standing authorized activation: verified prior sole port-3000 listener PID 79770, cwd `/mnt/storage/projects/nana-website`, command `next-server (v16.4.3)`, socket inode 164701754. Activated build, then verified PID 82795, same cwd/command, socket inode 165000985 bound to `0.0.0.0:3000`. Evidence `/tmp/pikso-reader-prefetch-activation.json`.
- Post-activation HTTP via curl: local `/books` and reader route HTTP 200; domain `devreact.edjavu.cloud/books` and reader route HTTP 200. Reader HTML includes dynamic reader bootstrap. Python urllib received 403 from domain, then curl with ordinary browser UA got HTTP 200; no credentials/session were used. Evidence `/tmp/pikso-reader-prefetch-http.json`.
- Lifecycle: completed. Gate: PASS for source, functional tests, build, and activation; PARTIAL for device UI/performance due to no browser/Safari verification. Review mode `self_review`, not independent QA. No status/PDF/cover/data/auth change.
