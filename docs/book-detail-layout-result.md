# PIKSO-BOOK-DETAIL-LAYOUT/r1

- Contract lightweight; execution `direct_native`; responsibility `native_pi`; target current nana-website detail route `/books/[slug]`, baseline build `aA5lgo10dJ-5x3OcEnPZD`.
- Objective: correct mobile cover overflow and overlapping copy/CTA shown in Owner screenshot `/tmp/aionui/508f1441/IMG_8091.png`.
- Included: existing detail-only CSS, functional regressions, full checks and authorized port-3000 activation. Excluded: catalog, reader, text/data/status, cover/PDF bytes, API/auth/env/proxy, migrations, commit/push, browser/visual tooling.
- Acceptance: cover constrained independently of intrinsic image size; mobile uses a bounded square contain preview above normal-flow copy; long title wraps; page can scroll to CTA above bottom navigation; existing detail/public-query/back/read routes preserved; tests/lint/types/build pass and successful build activated.
- Reuse decision `EXTEND_EXISTING`: existing `.book-detail-*` styles and server detail page, no new component/API. Current image sizing combines intrinsic 900x900 image, auto grid row and percentage height with a constrained cover container; removing the image from grid intrinsic-size calculations gives the wrapper sole ownership of layout dimensions.
- Observed evidence: domain detail HTTP 200, cover HTTP 200 `image/webp`, 101,156 bytes and 900x900; central pixels show artwork from first row, not the giant blank region in screenshot. Screenshot is visible failure evidence; no browser reproduction/root-cause trace. Baseline snapshots `/tmp/pikso-detail-before`, HTTP `/tmp/pikso-detail-before.html`, downloaded cover `/tmp/pikso-detail-cover.webp`.
- Skills: native-workflow, kitab-operator (healthy; STD-023), native-programmer/reuse-first, distinct native-quality-review self_review. Installed Next CSS guide inspected. Source checks do not prove Safari visual rendering.

## Result / distinct self_review

- Changed only mobile detail CSS in `src/app/globals.css`; added `tests/book-detail-layout.test.ts`; server page markup and desktop rules unchanged. `book-detail-cover` owns a max-260px square; absolute contained image prevents intrinsic image dimensions contributing to mobile grid row size; overflow is clipped at rounded cover bounds. Copy remains separate normal-flow sibling. Mobile screen switches to block flow with vertical scrolling and retains bottom-nav/safe-area padding. Title line-height raised to 1.08 with long-token wrapping retained.
- Initial experiment also positioned the desktop image, but review removed that unnecessary scope and reran all checks. One source assertion still expected desktop positioning; corrected to assert unchanged desktop contain/height, then fresh tests passed.
- AC cover isolation / bounded square / long title / scroll-to-CTA: PASS source/CSS declarations. AC public lookup, missing-book guard, content, cover/read/back URLs: PASS actual transpiled page SSR test. Does not prove visual or hit-target behavior on device.
- `npx tsx --test tests/book-detail-layout.test.ts`: 2/2 PASS. `npm test`: 52/52 PASS. `npm run lint`, `npm run typecheck`, fresh final `npm run build`: PASS. Logs `/tmp/pikso-detail-{tests,lint,types,build}.log`.
- Final review target diff `/tmp/pikso-detail-final.diff` (supersedes initial `/tmp/pikso-detail.diff`). No independent QA, no Git metadata; baseline snapshots provide provenance. No blocking findings in bounded scope; gate `self_review PASS`, state `verified_self` for implementation; actual Safari visual resolution UNKNOWN.

## Activation / close

- Final build `P01eywcz-1dAm5rKNP7dI`. Authorized bounded helper `/tmp/pikso-detail-activate.py` verifies `/proc` listener/cwd/command/socket before SIGTERM. Sole prior listener PID 65805/socket 162555472, `next-server (v16.4.3)`, cwd `/mnt/storage/projects/nana-website`; final sole listener PID 67265/socket 162680677, same cwd/command, `0.0.0.0:3000`.
- Local and domain detail HTTP 200; both 14,034 characters and include new build ID and detail markup. Final generated CSS includes 260px cover bound, square ratio and scroll declarations. Evidence `/tmp/pikso-detail-{activation,preactivation}.json`, `/tmp/pikso-detail-final-{local,domain}.html`.
- No catalog CSS, book data/status/PDF/cover, reader/auth/API, env/proxy/credential/migration, commit/push changes. No browser/visual tooling.
- Lifecycle completed, implementation/check gate PASS. Next decision: Owner opens/reloads detail page and confirms mobile layout; exact Safari layout-engine root cause remains untraced without browser reproduction.
