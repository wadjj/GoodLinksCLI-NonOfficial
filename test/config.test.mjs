import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  DEFAULT_BASE_URL,
  redactToken,
  resolveConfig
} from "../dist/config.js";

test("resolves config from flags before env and file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "goodlinks-config-"));
  const configPath = join(dir, "config.json");
  await writeFile(
    configPath,
    JSON.stringify({
      baseUrl: "http://file.example/api",
      token: "file-token"
    })
  );

  const config = await resolveConfig({
    flags: {
      baseUrl: "http://flag.example/api",
      token: "flag-token"
    },
    env: {
      GOODLINKS_API_BASE_URL: "http://env.example/api",
      GOODLINKS_API_TOKEN: "env-token"
    },
    configPath
  });

  assert.equal(config.baseUrl, "http://flag.example/api");
  assert.equal(config.token, "flag-token");
});

test("falls back to env, config file, and default base url", async () => {
  const dir = await mkdtemp(join(tmpdir(), "goodlinks-config-"));
  const configPath = join(dir, "config.json");
  await writeFile(configPath, JSON.stringify({ token: "file-token" }));

  const envConfig = await resolveConfig({
    env: { GOODLINKS_API_TOKEN: "env-token" },
    configPath
  });
  assert.equal(envConfig.baseUrl, DEFAULT_BASE_URL);
  assert.equal(envConfig.token, "env-token");

  const fileConfig = await resolveConfig({ env: {}, configPath });
  assert.equal(fileConfig.baseUrl, DEFAULT_BASE_URL);
  assert.equal(fileConfig.token, "file-token");
});

test("redacts tokens without leaking the original value", () => {
  assert.equal(redactToken("abcd1234efgh5678"), "abcd...5678");
  assert.equal(redactToken("short"), "<redacted>");
  assert.equal(redactToken(undefined), undefined);
});

