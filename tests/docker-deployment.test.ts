import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const dockerfile=readFileSync("Dockerfile","utf8");
const ignore=readFileSync(".dockerignore","utf8");
const guide=readFileSync("docs/coolify-docker.md","utf8");

test("Dockerfile uses standalone multi-stage output, Node 24, native runtime dependencies and non-root healthchecked server",()=>{
  assert.match(dockerfile,/FROM node:24-bookworm-slim AS base/);
  assert.match(dockerfile,/FROM base AS dependencies[\s\S]*npm ci --include=dev --include=optional/);
  assert.match(dockerfile,/COPY scripts\/copy-pdf-worker\.mjs/);
  assert.match(dockerfile,/FROM base AS builder[\s\S]*npm run build[\s\S]*bootstrap[\s\S]*scripts\/migrate\.ts scripts\/create-admin\.ts/);
  assert.match(dockerfile,/FROM base AS production-dependencies[\s\S]*npm ci --omit=dev --include=optional --ignore-scripts/);
  assert.match(dockerfile,/COPY --from=builder --chown=node:node \/app\/bootstrap/);
  assert.match(dockerfile,/COPY --from=builder --chown=node:node \/app\/db/);
  assert.match(dockerfile,/COPY --chown=node:node scripts\/docker-entrypoint\.sh/);
  assert.match(dockerfile,/rm -f \.next\/standalone\/\.env \.next\/standalone\/\.env\.\*/);
  assert.match(dockerfile,/NODE_ENV=production/);
  assert.match(dockerfile,/STORAGE_DIR=\/app\/storage/);
  assert.match(dockerfile,/COPY --from=builder --chown=node:node \/app\/\.next\/standalone/);
  assert.match(dockerfile,/COPY --from=production-dependencies --chown=node:node \/app\/node_modules/);
  assert.match(dockerfile,/USER node/);
  assert.match(dockerfile,/HEALTHCHECK[\s\S]*fetch\('http:\/\/127\.0\.0\.1:'/);
  assert.match(dockerfile,/ENTRYPOINT \["\/bin\/sh", "\/app\/docker-entrypoint\.sh"\]/);
  assert.match(dockerfile,/--rootDir \. --outDir \/app\/bootstrap[\s\S]*scripts\/migrate\.ts scripts\/create-admin\.ts/);
  assert.match(dockerfile,/CMD \["node", "server\.js"\]/);
  const entrypoint=readFileSync("scripts/docker-entrypoint.sh","utf8");
  assert.match(entrypoint,/#!/);
  assert.match(entrypoint,/echo "Running database migrations\.\.\."/);
  assert.match(entrypoint,/set -eu/);
  assert.match(entrypoint,/node \/app\/bootstrap\/scripts\/migrate\.js/);
  assert.match(entrypoint,/node \/app\/bootstrap\/scripts\/create-admin\.js/);
  assert.match(entrypoint,/exec "\$@"/);
  assert.ok(entrypoint.indexOf("migrate.js")<entrypoint.indexOf("create-admin.js"));
});

test("Docker build context excludes secrets, local storage and host dependencies",()=>{
  for(const entry of [".git","node_modules",".next","storage",".env",".env.*"]){
    assert.ok(ignore.split(/\r?\n/).includes(entry),`missing dockerignore entry ${entry}`);
  }
  assert.ok(!ignore.split(/\r?\n/).some(entry=>entry.startsWith("!")),"build context must not re-include excluded artifacts");
});

test("Coolify guide documents automatic ordered bootstrap, idempotency and credential risk",()=>{
  assert.match(guide,/`\/app\/storage`/);
  assert.match(guide,/satu replica\/proses/);
  assert.match(guide,/migration.*seed.*server/i);
  assert.match(guide,/tidak mengganti password/i);
  assert.match(guide,/kredensial.*lemah/i);
  assert.match(guide,/DATABASE_URL/);
  assert.match(guide,/BETTER_AUTH_URL/);
  assert.match(guide,/BETTER_AUTH_SECRET/);
  assert.match(guide,/tidak.*deployment Coolify/i);
});

test("Next standalone tracing excludes secrets and private host storage",()=>{
  const source=readFileSync("next.config.ts","utf8");
  assert.match(source,/output:\s*["']standalone["']/);
  assert.match(source,/outputFileTracingExcludes[\s\S]*\.env[\s\S]*storage/);
  const config=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  assert.doesNotMatch(config,/\.env=|storage\/books/);
});
