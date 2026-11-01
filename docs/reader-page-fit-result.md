# PIKSO-READER-PAGE-FIT/r1

## Contract — lightweight
- Execution: `direct_native`; responsibility: `native_pi`.
- Objective: remove viewer-created bottom paper space and keep PDF page/flipbook geometry synchronized during zoom.
- Target: `/mnt/storage/projects/nana-website`; baseline `/tmp/pikso-reader-fit-before/src/` (no Git metadata).
- Included: shared reader dimensions, reader-only CSS, functional regressions, successful production-build activation under standing Owner authorization.
- Excluded: PDF/cover/book/status/data changes, auth/cache/transfer changes, dependencies, environment/proxy/database, migrations, commit/push, browser/visual tools.
- Acceptance: (1) dimensions follow PDF aspect ratio, no competing viewport paper constraints; (2) one-page/portrait/spread dimensions and shared zoom stay aligned; (3) navigation/cache/loading/error behavior retained; (4) full tests/lint/types/build and verified activation.
- Workflow: intake/classify/contract → native-programmer + reuse-first → native-quality-review (`self_review`) → close/report. KITAB status HEALTHY, STD-023 resolved/read; installed Next CSS guide read.

## Investigation and reuse
- Screenshot `/tmp/aionui/508f1441/IMG_8094.png` shows a narrow bottom strip on page 5. It does not establish the device-computed CSS.
- Actual reference PDF page 5 viewport ~567×567. Native Node PDF.js/canvas parsing/render check shows colored artwork in its bottom eight rows, not a substantial blank band. This is PDF-content evidence, not Safari/browser evidence.
- Existing mobile `.reader-page { max-width:90vw }` could squeeze the canvas horizontally (`max-width:100%`, auto height) after Page had rendered at the larger JS width, while page-flip retained its larger fixed height. Mobile paper height and book max-height/max-width also competed with JS geometry. The source defect can explain the observed strip; exact Safari computed dimensions remain unobserved.
- Reuse decision `EXTEND_EXISTING`: keep React-PDF, react-pageflip, existing first-page ratio, fixed-size calculation and shared zoom wrapper. No new layout abstraction or renderer.

## Changes
- `src/components/reader/flipbook.tsx`: Paper explicitly receives width/height, also covering the single-page case. Flipbook root receives width of one page in portrait/two in spread plus the corresponding height, necessary with `autoSize=false`. Shared ancestor zoom remains single-applied; no PDF crop/stretch or compounded dimension multiplication.
- `src/app/globals.css`: remove independent mobile paper height/width/90vw cap and book viewport caps. Mobile paper max-width becomes parent-relative 100%; JS remains the size owner. Preserve existing shadow, palette, stage scroll, canvas auto-height and controls.
- `tests/reader-page-fit.test.ts`: direct function/element-prop assertions for 1/15 pages, single/spread and zoom 1/1.25/2; PostCSS constraints; real PDF page-5 native render/content check. No DOM/browser/lifecycle simulation.

## Verification
- `node --import tsx --test tests/reader-page-fit.test.ts tests/reader-repair.test.ts`: 11/11 PASS.
- `npm test`: 66/66 PASS (EXIT 0); `npm run lint`: PASS (EXIT 0); `npm run typecheck`: PASS (EXIT 0); `npm run build`: PASS (EXIT 0), BUILD_ID `EUflkxQrbc0esahuW9Mf7`.
- After build, verified previous listener through `/proc`: PID 73691, `next-server (v16.4.3)`, cwd project, socket inode 163796256 on 0.0.0.0:3000. Activated under standing Owner authorization; new listener PID 74901, same command/cwd, socket inode 164001759. Evidence `/tmp/pikso-reader-fit-activation.json`.
- Post-activation local and domain `/books/nana-dan-kerajaan-di-atas-awan/read` both HTTP 200 (8,552 characters); `/books` both HTTP 200 (11,868 characters). HTTP response verifies server route availability, not device rendering. Worker remains 1,317,034 bytes, SHA256 `a33cfe728c584fdba4fcc1fd54bcdc2f9f2f13889ddbb5b2bd1d0f8cbe49b84e`.
- Final self-review against the contract: exact authored style ratio/zoom and PDF artwork are functionally checked; existing reader/cache integration tests stay green; CSS no longer sets independent paper dimensions/caps, except parent-relative mobile max-width 100%; no PDF/canvas cropping, book data or behavior changed. No added regression found.
- Review mode `self_review`, gate `PASS` for code/function tests and build. **Safari appearance/zoom remains unverified** without browser tooling and should be confirmed by Tuan.

## Closure and provenance
- Lifecycle `completed`; code/functional gate `PASS`; device appearance `UNKNOWN`.
- Diff: `/tmp/pikso-reader-fit.diff`; full logs `/tmp/pikso-reader-fit-{tests,lint,types,build}.log`; activation `/tmp/pikso-reader-fit-{preactivation,activation}.json` and helper script. No Git revision claim.
- Initial native operator diagnostic failed due to an undefined namespace; corrected diagnostic used the imported PDF.js namespace. Initial test-only adapter typing required `canvas:null` and the canonical CanvasRenderingContext2D cast; final typecheck passed. None of these failures establishes a Safari finding.
- Acceptance 1/2: PASS through geometry/zoom and CSS assertions. Acceptance 3: PASS regression suite/source diff (cache/navigation/loading unchanged). Acceptance 4: PASS tests/lint/types/build/verified listener and HTTP checks.
- Next boundary: Tuan reloads the updated reader, checks page 5 and the + control; investigate further only if the strip remains. No next authorization needed for completed scoped work. No PDF/cover/book/status/database/environment/proxy/credential/dependency/migration/commit/push effects.
