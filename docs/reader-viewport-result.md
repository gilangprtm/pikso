# PIKSO-READER-VIEWPORT/r1

- Lightweight contract; direct_native, native_pi; target current working tree over fd1634d, reader shared by public/admin.
- Objective: reader stays within viewport without visible horizontal/vertical stage scrollbars at normal zoom. Preserve page flip, PDF/auth/cache, header/footer and zoom access.
- Scope: existing reader CSS and regression tests; exclude database, credentials, dependencies, unrelated UI, commit/push.
- Reuse decision EXTEND_EXISTING: retain Flipbook dimensions/zoom and canonical .reader-screen/.reader-stage rules, no new components. Existing stage overflow:auto permits off-page animated elements to create scrollbars despite visible page fitting.
- Acceptance: reader viewport bounds overflow; normal stage hidden overflow; zoom-only scrolling still available without visible bars; existing page-size/zoom/navigation tests unchanged. Full tests/lint/typecheck/build, final diff self_review; standing-authorized activation only after /proc listener checks and HTTP verification.
- Phases: native-workflow → kitab-operator / STD-023 → native-programmer / reuse-first → native-quality-review self_review → close/report.
- Pre-existing story-access working tree preserved; not part of this local CSS change. No design-replication/screenshot slicing; bounded CSS correction to Next.js reader.

## Outcome

- Lifecycle: completed; gate: **PASS** for source/test/build/activation/HTTP verification; review mode `self_review`.
- Implemented in `src/app/globals.css`: reader viewport is clipped; stage has `min-width:0`, `min-height:0`, and `overflow:hidden` at normal zoom. Zoomed stage retains panning with scrollbar hidden via Firefox and WebKit rules.
- Added CSS and component-state assertions to `tests/reader-page-fit.test.ts`.
- Checks exit 0: `npm test` (83/83), `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`.
- Build `No3B9IriLWP6NZD22ixr_` activated after `/proc` verified prior listener PID 91510/cwd/command/socket; new listener PID 92443 verified on `0.0.0.0:3000` in project cwd.
- Public reader GET and PDF HEAD returned 200 locally and via `https://devreact.edjavu.cloud`. Served reader CSS was fetched from both origins; stage computed-rule text shows `overflow:hidden`, zoom rule `overflow:auto; scrollbar-width:none`; exact CSS asset URL/hash content aligned through shared filename and declarations.
- Evidence: `/tmp/pikso-reader-viewport-tests.log`, lint/types/build logs, `/tmp/pikso-reader-viewport-build.json`, `/tmp/pikso-reader-viewport-activation.json`, `/tmp/pikso-reader-viewport-http.json`, `/tmp/pikso-reader-viewport-css-http.json`.
- Screenshot is Owner evidence, not post-change visual proof. No browser screenshot/scrollbar pixel observation was made. CSS behavior is functionally covered, but actual browser/device scrollbar appearance is not independently observed. No auth/data/cache/reader functionality changed; pre-existing unrelated story-access working tree was left intact.
