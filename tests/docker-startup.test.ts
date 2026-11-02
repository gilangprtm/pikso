import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Exercise the real shell entrypoint without touching /app or connecting to a DB.
function runStartup(failAt: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "pikso-startup-test-"));
  try {
    const log = path.join(dir, "calls");
    writeFileSync(path.join(dir, "node"), `#!/bin/sh
printf '%s|%s\\n' "$1" "\${2-}" >> "$STARTUP_TEST_LOG"
case "$1" in
  */migrate.js) [ "$STARTUP_FAIL_AT" != migration ] || exit 21 ;;
  */create-admin.js) [ "$STARTUP_FAIL_AT" != seed ] || exit 22 ;;
esac
`, { mode: 0o700 });
    const result = spawnSync("/bin/sh", ["scripts/docker-entrypoint.sh", "node", "server.js", "argument with spaces"], {
      encoding: "utf8",
      env: { NODE_ENV: "test", PATH: dir, STARTUP_TEST_LOG: log, STARTUP_FAIL_AT: failAt },
    });
    assert.ifError(result.error);
    return { status: result.status, calls: readFileSync(log, "utf8").trim().split("\n") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("container starts migration then seed then server, preserving command arguments", () => {
  const result = runStartup("");
  assert.equal(result.status, 0);
  assert.deepEqual(result.calls, [
    "/app/bootstrap/scripts/migrate.js|",
    "/app/bootstrap/scripts/create-admin.js|",
    "server.js|argument with spaces",
  ]);
});

test("migration failure preserves exit status and prevents seed and web startup", () => {
  const result = runStartup("migration");
  assert.equal(result.status, 21);
  assert.deepEqual(result.calls, ["/app/bootstrap/scripts/migrate.js|"]);
});

test("seed failure preserves exit status and prevents web startup", () => {
  const result = runStartup("seed");
  assert.equal(result.status, 22);
  assert.deepEqual(result.calls, [
    "/app/bootstrap/scripts/migrate.js|",
    "/app/bootstrap/scripts/create-admin.js|",
  ]);
});
