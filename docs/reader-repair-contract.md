# PIKSO-READER-REPAIR/r1

- Path: direct_native; responsibility: native_pi; contract: full, bounded shared-reader repair.
- Target: nana-website reader at deployed baseline `m2gNEV8-p9wazL1saSF-8`; source snapshots `/tmp/pikso-reader-before` (no Git metadata).
- Objective: repair demonstrated PDF.js compatibility / React-PDF 11 error handling defects affecting public reading and admin preview.
- Included: existing Flipbook/ReaderLoader, PDF.js browser module resolution, copied worker, focused functional tests, build and authorized activation.
- Excluded: layout redesign, PDF/cover/data/status changes, schema/auth/routes/env/proxy/credentials, browser tooling, dependency major upgrades, commit/push.
- Acceptance: (A1) actual reference PDF loads and first page produces render operators through compatibility build in isolated Node without modern optional methods; (A2) React-PDF uses callback error mode and async first-page errors do not escape; (A3) viewer/import failures have local retry and same protected/public file fallback, not global application error; (A4) API/auth/layout contracts unchanged; (A5) tests/lint/types/build and socket-verified activation pass.
- Evidence caveat: functional tests and HTTP cannot prove the exact Safari exception or successful on-device visuals. Screenshot proves generic error, not exception text.
- Reuse: EXTEND_EXISTING shared Flipbook and ReaderLoader, reuse React-PDF's documented `suspense={false}`, reuse bundled legacy PDF.js API/worker rather than custom rendering or downgrade. No parallel reader.
- Architecture review: DESIGN_BOUNDED. Existing consumers are public read and admin preview. Options: (1) callback mode alone fixes error propagation but not demonstrated missing typed-array worker APIs; (2) legacy API+worker and callback mode with local fallback (chosen; no new dependencies or hand-written polyfills); (3) renderer replacement/downgrade (rejected: broader compatibility/API changes). Browser-only alias preserves server cover generation and external packages; no API/auth/persistence contract change.
- Phases: intake/classify/contract → programmer + reuse-first → functional verification → distinct native-quality-review/self_review → activation/close/report.
- Install note: attempted pinned core-js install failed before package/lock changes with npm ENOENT on an unrelated optional Tailwind package. Not retried; no new dependency required. The repair retains the documented browser minimum; it does not promise support for iOS below 18.
- Next boundary: no data repair or infrastructure changes; stop on uncertain effect, failed gates, or contract expansion. Safari-specific outcome remains unverified until Owner checks.
