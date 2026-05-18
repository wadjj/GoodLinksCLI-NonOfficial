import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("prints help and exits successfully", () => {
  const result = spawnSync(process.execPath, ["dist/cli.js", "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /GoodLinks CLI/);
  assert.match(result.stdout, /Usage:/);
});

test("runs when invoked through a symlinked bin path", async () => {
  const dir = await mkdtemp(join(tmpdir(), "goodlinks-bin-"));
  const binPath = join(dir, "goodlinks");
  await symlink(resolve("dist/cli.js"), binPath);

  const result = spawnSync(process.execPath, [binPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /GoodLinks CLI/);
});
