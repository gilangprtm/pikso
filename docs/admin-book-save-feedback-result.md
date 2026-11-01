# PIKSO-BOOK-SAVE-FEEDBACK/r1

- Execution: `direct_native`; lightweight contract; responsibility `native_pi`.
- Target: `/mnt/storage/projects/nana-website`; no Git metadata available. Baselines `/tmp/pikso-save-feedback-before`; AdminBookActions/BooksTable baselines reconstructed from exact known edits and labelled as such during capture.
- Objective: square, uncropped edit-cover preview; successful create/edit returns to originating admin page and shows success toast.
- Exclusions: PDF/cover bytes, production book data/status, upload/API/auth contracts, preview-reader diagnosis, environment/proxy/credentials, migrations, commits/pushes.
- Governance: KITAB healthy, STD-023 resolved/read. Workflow: intake/contract → native-programmer/reuse-first → native-quality-review (`self_review`) → activation → close.

## Implementation and reuse

`EXTEND_EXISTING`: reuse BookForm save handlers, existing Base Nova Sonner wrapper and persistent AdminWorkspace. No new dependencies. Success inline alerts removed in favor of Sonner; existing error alerts retained.

- Cover CSS previously forced `object-fit:cover`, overriding the component's contain utility. Field layout stretched width while old image height stayed fixed. Preview now has responsive width capped at 18rem, square aspect ratio and explicit scoped `object-fit:contain`; stored image untouched.
- Create and edit success both show their success toast and navigate to a validated `returnTo`. The persistent workspace mounts the Toaster so it survives navigation.
- List create/edit entry points carry normalized pagination/filter/search/sort state. Dashboard create entry points return to dashboard. Direct links default to `/admin/books`.
- Small client-safe return helper only permits `/admin` or `/admin/books`, rejects external/editor/login destinations and strips obsolete `created` alert parameter.

Changed source: `src/components/admin/{book-form,AdminWorkspace,AdminBookActions,BooksTable}.tsx`, `src/app/admin/admin-theme.css`, `src/app/admin/(workspace)/{page,books/page}.tsx`, `src/lib/admin-book-return.ts`.

## Acceptance evidence

1. **Square uncropped preview — PASS (source/compiled CSS)**: SSR class checks and generated Tailwind/CSS assertions verify square aspect ratio, capped width and contain. No browser/pixel claim.
2. **Create/edit success navigation and toast — PASS (isolated handler)**: four handler tests execute actual transpiled form handler with mocked React hooks/router/network/toast. Both success paths save metadata first, toast, then navigate to originating filtered page. Both failures keep form and do not toast/navigate. Not a browser or React lifecycle test.
3. **Safe originating destination — PASS**: unit tests preserve list query state, dashboard, fallback and reject unsafe URLs; source tests verify list entry-point wiring.
4. **Regression checks — PASS**: `npm test` 41/41; `npm run lint` exit 0; `npm run typecheck` exit 0; `npm run build` exit 0. Expected negative-path API logs occur in isolated tests.
5. **Activation — PASS**: build `m2gNEV8-p9wazL1saSF-8`; verified old listener PID 58021/socket 161186344/project cwd/next-server command before SIGTERM. New PID 60106/socket 161403036 verified on `0.0.0.0:3000`, same project cwd/command. Evidence `/tmp/pikso-save-feedback-activation.json`.
6. **HTTP — PASS**: local and devreact.edjavu.cloud admin login 200; unauthenticated books 307 to admin login. No authenticated production write/test book used.

## Review and close

`self_review`: PASS for scoped implementation and functional checks. No independent QA; Safari/rendered visuals/authenticated end-to-end navigation remain unverified. No source change aimed at the earlier draft/publication or reader-preview issue, and no conclusion added about their cause.

Lifecycle: `completed`. Runtime activation completed under standing Owner authorization. Next: Owner can refresh and check cover/save flow in their authenticated session; any production-data mutation remains separately authorized.
