import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("prints help and exits successfully", () => {
  const result = spawnSync(process.execPath, ["dist/cli.js", "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /GoodLinks CLI/);
  assert.match(result.stdout, /Usage:/);
});
