# PIKSO-BOOK-DETAIL-BACKGROUND/r1

- Lightweight contract; direct_native, native_pi; target current working tree over fd1634d in `/mnt/storage/projects/nana-website`.
- Objective: only `/books/nana-dan-hutan-seribu-keajaiban` uses the same background image/overlay/position/size as `/books`; preserve other stories and reader.
- Scope: conditional background class in existing detail page, shared catalog CSS declaration, regression assertions, build/restart with standing authorization. Exclusions: data/auth/API changes, new images/dependencies, unrelated layout, commit/push.
- Reuse EXTEND_EXISTING: reuse `/assets/scenes/books-background.png` and exactly the same canonical background rule (grouped selectors); no duplicate CSS value or new component. Higher-specificity conditional class overrides old detail gradient only for requested slug.
- Acceptance: target class renders only on named story; same declaration as catalog; existing detail layout/links/missing guard remain; full tests/lint/typecheck/build; verified /proc listener and local/domain target/CSS response.
- Phases: native-workflow → kitab-operator / STD-023 → native-programmer / reuse-first → native-quality-review self_review → close/report.
- Pre-existing changes preserved. Browser visual equivalence is not claimed without actual browser evidence.

## Outcome

- Lifecycle completed; gate PASS for automated/source/build/activation/HTTP verification, review mode self_review.
- Changed `src/app/books/[slug]/page.tsx`, `src/app/globals.css`, `tests/book-detail-layout.test.ts`. Existing story-access/reader viewport changes preserved.
- Tests confirm conditional class appears only for requested slug, original links/cover/mobile layout/missing guard remain, and shared CSS value equals catalog. Other detail backgrounds remain unchanged.
- `npm test` (83/83), lint, typecheck, production build, diff check all exit 0. Build `ril8lZdUJpc2eupFbcj42` activated after `/proc` old listener identity verification: PID 92443 → PID 93304, correct project cwd/command/socket on 0.0.0.0:3000.
- Catalog, named detail and its reader returned 200 locally and on devreact.edjavu.cloud; served HTML contains correct conditional background class only on detail. Domain compiled CSS confirms shared catalog/detail declaration with image and identical overlay/center/cover/no-repeat.
- Initial served-CSS text assertion failed because production minification converts `::before` to `:before` and rgba to hex alpha; inspection confirmed canonical equivalent CSS, then corrected read-only assertion passed. No application change/restart retry was needed.
- Evidence `/tmp/pikso-detail-background-checks.json`, associated check logs, `/tmp/pikso-detail-background-activation.json`, `/tmp/pikso-detail-background-http.json`, `/tmp/pikso-detail-background-css-http.json`.
- Browser visual/device testing not performed. No DB/content/auth/reader behavior changes; no commit/push.
