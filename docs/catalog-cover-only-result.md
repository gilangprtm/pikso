# PIKSO-CATALOG-COVER-ONLY/r1

- Path: direct_native; lightweight reversible UI contract; native_pi responsibility.
- Objective/target: show only story covers on `/books`, removing the displayed title and white fade. Baseline build `Uvft0iivt2QrwLEKljXEP`; resulting build `16rCt2oNGzb1PXwb5PMr5`.
- Included: existing catalog card markup/scoped CSS, regression tests. Excluded: cover files, PDFs, book status/database, APIs/cache policy, carousel algorithm/pagination, environment/proxy/credentials/dependencies/migrations, commits/pushes.
- Context/phases: KITAB status healthy + STD-023 resolved/read (prior to compaction); native-workflow → native-programmer/reuse-first → native-quality-review self_review → close/report. Read installed Next.js CSS guide before edits.
- Reuse decision: retain existing CatalogCarousel and shadcn/Embla deck; remove one title markup element and catalog-specific fade/title CSS only. Keep accessible link names using book.title; image remains decorative within the named link.
- Changed artifacts: `src/components/catalog/catalog-carousel.tsx`, `src/app/globals.css`, `tests/catalog-cards.test.ts`, `tests/catalog-carousel.test.ts`, this result record.

## Acceptance and self_review

1. No displayed card title: PASS. Removed book-meta/h2; direct component-element assertion verifies one cover child with existing image attributes.
2. No fade overlay: PASS, source/CSS evidence. Deleted catalog book-card::after generator; existing book-cover::after display:none remains.
3. Square shape, rounded corners, cover image, accessible destination, swipe/loop/pagination retained: PASS for source/functional checks. Carousel logic unchanged; existing regression tests pass.
4. Full verification: PASS. `npm test` 75/75, `npm run lint`, `npm run typecheck`, `npm run build` all exit 0. Logs `/tmp/pikso-cover-only-final-{tests,lint,types,build}.log`.
5. Activation under standing port-3000 authorization: PASS. `/proc` verified sole prior listener PID 84506, expected project cwd, next-server v16.4.3, socket 165203199. New listener PID 85862, same cwd/command, socket 165319974 on `0.0.0.0:3000`. Evidence `/tmp/pikso-cover-only-{preactivation,activation}.json`.
6. Local/domain HTTP: PASS. `/books` 200 on local and `https://devreact.edjavu.cloud`; HTML parsing found six repeated carousel cards, each one cover image, named story link, no heading/meta. First default Python domain request received 403; subsequent bounded read with Mozilla User-Agent returned 200. No proxy change. Evidence `/tmp/pikso-cover-only-http.json`.

- Review target: final four-file implementation/test diff `/tmp/pikso-cover-only-source.diff`; no Git metadata, so used file snapshots/difflib (component baseline reconstructed by reinstating its sole removed line). No independent QA claimed. No material findings; no API/auth/data changes.
- Gate PASS for functional/source/build/runtime checks; actual visual appearance, Safari/device rendering and swipe smoothness remain unverified. No browser/visual automation performed.
- Lifecycle: completed. Next decision: Tuan checks the updated `/books` appearance on device; no further change authorized or required by this result.
