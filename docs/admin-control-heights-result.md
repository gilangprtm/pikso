# PIKSO-ADMIN-CONTROL-HEIGHTS/r1

- Execution path: `direct_native`; contract: lightweight; responsibility: Native Pi.
- Objective: ensure one-line input/select controls have the same visible 40px height and matching mobile type sizing across admin, addressing the Kelola Buku status control shown in `IMG_8083.jpeg`.
- Scope: shared Base Nova Input/Select/InputGroup/Combobox/NativeSelect styles, admin login field overrides, books-table filter widths, focused regressions. No behavior, API, auth, database, env, dependencies, commit, or push changes.
- Governing context: KITAB `STD-023` read after KITAB status HEALTHY (93 Markdown files, 0 errors/warnings). Project Next.js CSS guidance read. Reuse: extend shared components; retain Base Nova primitives; Input canonical height 40px, applied as Select default/small variants too. `cn()` orders later Tailwind overrides after base classes, so removed conflicting h-11 (44px) login overrides and used h-10.

## Acceptance / review

1. Status filter has same visible height as search input and form fields: corrected underlying Select height variants from 32/28px to 40px (the generated data-size utility outranked the caller h-10). The same shared Select fixes publication status on the book form and pagination selector.
2. One-line text controls share 40px sizing: login email/password overrides reduced from 44 to 40px; shared Input mobile text restored to 16px and sm+ to 14px; Select likewise. Shared input groups and single-line combobox inputs use 40px; multiline input groups remain auto-height. Native select variants now default to 40px.
3. Search and status controls have aligned flexible widths in the table filter row and can wrap at narrower widths; source/classes inspected, not browser-visual tested.
4. No unrelated behavior or persistence change.

## Checks

- `npm test`: PASS, 36/36, including assertions for generated Tailwind Select data-size rules and shared component sizing.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS; build ID `5PjVAja3a1Ge2ncko07VZ`.
- `/tmp/pikso-input-size.diff`: saved baseline/source changes reviewed.
- Before activation verified existing listener PID 57015, `next-server (v16.4.3)`, project cwd, socket inode 161088842 from `/proc`; after activation listener PID 58021, same command/cwd, socket inode 161186344, 0.0.0.0:3000. Evidence: `/tmp/pikso-input-activation.json`.
- After activation `/admin/login` returned HTTP 200 locally and via `https://devreact.edjavu.cloud`; `/admin/books` redirected HTTP 307 to login as expected unauthenticated.

Review mode `self_review`; gate `PASS` for source, tests, build, activation and unauthenticated HTTP checks. No browser, visual, or authenticated control-height measurements; actual rendered pixel equality therefore remains unverified. Lifecycle: `completed`. Owner can inspect the admin form and Kelola Buku filter; no further authorization needed for manual check.
