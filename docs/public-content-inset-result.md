# PIKSO-PUBLIC-CONTENT-INSET/r1

## Lightweight contract

- Execution direct_native; responsibility native_pi; target working tree over `fd1634db8321e8bb02e9b11c2ab83628cdd95f68`, `/mnt/storage/projects/nana-website`.
- Objective: bring `/books`, `/characters`, `/about` content inward toward center like `/`, based on Owner's two screenshots. Preserve typography, vertical layout, full-bleed background and global navigation; retain mobile gutters and carousel behavior.
- Scope: opt-in page class, scoped horizontal padding using existing home geometry, regression tests, build/activation under standing Owner authorization. Excluded: other detail routes, reader, admin, data/auth/API, assets/dependencies, credentials/proxy, migrations, commit/push.
- Reuse EXTEND_EXISTING: inspected home `.hero-inner` max-width 1540px / 8% padding, `.page-screen`, `.about-screen`, catalog responsive/Embla sizing and their call sites. Extend existing shells with scoped `content-inset-screen`; no wrapper/component/new dependency. Desktop inline inset equals home's centered outer margin + 8vw. Tablet 7%; mobile unchanged. Only padding-inline changes, so backgrounds/header/vertical fit stay owned by existing rules.
- Criteria: three routes opt in; desktop same inset geometry as home; tablet proportional; mobile unchanged; navigation/background/home/detail unaffected; carousel/pagination/access preserved; tests/lint/types/build/diff checks; verified listener before activation and local/domain route/CSS checks.
- Governance: KITAB healthy, 0 errors/warnings; STD-023 resolved/read. Phases native-workflow → native-programmer/reuse-first → native-quality-review (self_review) → close/report.
- Pre-edit snapshots `/tmp/pikso-centered-before/`; pre-existing working-tree changes preserved.

## Review / outcome

- Lifecycle completed, review `self_review`, gate **PASS** for automated/source/build/runtime checks (not visual browser rendering).
- Changed `src/app/books/page.tsx`, `src/app/characters/page.tsx`, `src/app/about/page.tsx`, `src/app/globals.css`; added `tests/public-content-inset.test.ts`, extended `tests/catalog-cards.test.ts`.
- Existing home geometry: `.hero-inner` has `max-width:1540px`, horizontal padding 8%. Opt-in desktop padding `max(8vw,calc((100vw - 1540px)/2 + 8vw))` yields same content start, with viewport-sized backgrounds/header preserved. Tablet keeps 7%; mobile is unchanged. No alteration of carousel-owned slide geometry, typographic scale or vertical spacing.
- `npm test`: 85/85 pass; `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`: exit 0. Build `uyoN8OEpZSamgQd-z05Za`.
- Before restart, `/proc` verified old port listener PID 93304, project cwd, Next 16.4.3 process and listening socket. Activated build; new verified listener PID 94656 on 0.0.0.0:3000 in project cwd.
- `/`, `/books`, `/characters`, `/about`, and target detail each HTTP 200 locally and via `devreact.edjavu.cloud`; build ID present. Three requested routes opt in, home and detail do not. Served CSS (local + domain, byte-identical SHA-256 `c8ed9c2bafae21440274752f8ab002ca35e1967d7f1a7b5a5861608319ad386b`) contains compiled desktop/tablet inset.
- The CSS CDN URL briefly returned 403 during an initial read-only fetch; same asset was obtained from local server and domain retry, where both copies were HTTP 200 and identical. No artifact correction or operational retry occurred.
- Evidence: `/tmp/pikso-public-content-inset-checks.json`, command logs, `/tmp/pikso-public-content-inset-activation.json`, `/tmp/pikso-public-content-inset-http.json`, `/tmp/pikso-public-content-inset-css-http.json`.
- Actual browser/device visual testing remains unperformed. No commit/push, data/auth/API changes.
