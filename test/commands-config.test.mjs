import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  runConfigGetCommand,
  runConfigSetTokenCommand
} from "../dist/commands/config.js";
import { readStoredConfig } from "../dist/config.js";

test("config set-token writes token with 0600 permissions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "goodlinks-config-"));
  const configPath = join(dir, "config.json");

  const result = await runConfigSetTokenCommand({
    token: "abcd1234efgh5678",
    configPath
  });

  assert.deepEqual(result, { saved: true, token: "abcd...5678" });
  assert.equal((await readStoredConfig(configPath)).token, "abcd1234efgh5678");
  assert.equal((await stat(configPath)).mode & 0o777, 0o600);
});

test("config get redacts token", async () => {
  const dir = await mkdtemp(join(tmpdir(), "goodlinks-config-"));
  const configPath = join(dir, "config.json");
  await runConfigSetTokenCommand({ token: "abcd1234efgh5678", configPath });

  assert.deepEqual(await runConfigGetCommand({ configPath }), {
    token: "abcd...5678"
  });
});

