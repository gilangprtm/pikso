# PIKSO-STORY-ACCESS-ACTIVATE/r1

- Path: direct_native; contract: full; responsibility: native_pi.
- Owner authorization: “ya lakukan build dan restart”.
- Target: current uncommitted Pikso story-access implementation above fd1634d; `/mnt/storage/projects/nana-website`, production `0.0.0.0:3000`.
- Scope: full tests/lint/typecheck/build, database readiness read-only, verify listener identity using /proc, graceful stop and launch production server once, verify new listener and local/domain HTTP.
- Exclusions: migration/seed/data mutations, env/credentials/proxy/dependency changes, code refactors, commit/push.
- Acceptance: checks exit 0; migration 003 and signing configuration ready; correct prior/new listener cwd/command/socket; new build identity served; public catalog/detail/reader/PDF HEAD and admin auth boundary healthy locally and on domain.
- Reuse: existing start command and /proc socket-ownership procedure; no application code changes.
- Recovery: no force-kill or blind retries; ambiguous launch/post-state stops for inspection/Owner decision. Retain additive database schema.
- Phases: native-workflow → kitab-operator / applicable STD-023 → direct bounded operation → native-quality-review self_review → close/report.

## Preflight

- KITAB healthy, 0 errors/warnings.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`: exit 0. Fresh build: `97BJtVvfXjIpOXPFCJAFj`.
- Read-only database: pikso.public, migration 003 applied, 3 books, 0 locked, no missing access versions. Signing secret readiness checked as boolean only; no secret printed.
- Actual port listener: PID 85862, cwd project, command `next-server (v16.4.3)`, socket inode 165319974 on 0.0.0.0:3000.
- Evidence: `/tmp/pikso-story-access-activation-checks.json`, associated logs, `/tmp/pikso-story-access-preactivation.json`.

## Outcome

- Lifecycle: **completed**; activation gate: **PASS** for build/listener/HTTP/static-asset checks. Browser/device behavior remains unverified.
- Old listener PID 85862 was verified to own socket inode `165319974` at `0.0.0.0:3000`, cwd project, command `next-server (v16.4.3)`; gracefully terminated with SIGTERM and socket released.
- Started once with `npm run start -- --port 3000`. New listener PID 91510, cwd project, command `next-server (v16.4.3)`, socket inode `169367642` on `0.0.0.0:3000`. Build ID `97BJtVvfXjIpOXPFCJAFj`; server ready observed in `/tmp/nana-production-server.log`.
- All 16 HTTP route checks returned expected status locally and on `https://devreact.edjavu.cloud`: home/catalog/detail/reader/login 200, PDF HEAD 200, admin create 307 to login, unlocked story access POST 200. Reader route rendered; PDF Content-Type/length/ranges were correct; access response was private/no-store. The pre-existing stories remain unlocked; no story code or data changed.
- Local route chunks returned HTTP 200. A first domain manifest request returned HTTP 403; a follow-up fetch of current-build HTML and its four referenced client chunks returned HTTP 200 locally and through the domain, with matching SHA-256 hashes. Static delivery is therefore confirmed for the sampled chunks; no proxy changes were made.
- Evidence: `/tmp/pikso-story-access-activation-checks.json`, `/tmp/pikso-story-access-preactivation.json`, `/tmp/pikso-story-access-activation-runtime.json`, `/tmp/pikso-story-access-postactivation.json`, `/tmp/pikso-story-access-activation-http.json`, `/tmp/pikso-story-access-build-http.json`, `/tmp/pikso-story-access-chunks-http.json`, check logs and `/tmp/nana-production-server.log`.
- Review: `self_review` (same Native Pi); source, build, listener, HTTP routes and sampled static-asset checks pass. No independent QA claimed.
- No seed, book/status/code mutation, additional migration, `.env`/credential/proxy change, commit or push. Browser/Safari/device interaction remains unverified.
