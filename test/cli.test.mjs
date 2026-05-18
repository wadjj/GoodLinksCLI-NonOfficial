import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { run } from "../dist/cli.js";

test("dispatches list command and writes JSON", async () => {
  let stdout = "";
  const client = {
    async listLinks(options) {
      assert.deepEqual(options, { list: "unread", tag: ["ai"], limit: 2 });
      return {
        data: [{ id: "abc", title: "Title", url: "https://example.com" }],
        hasMore: false
      };
    }
  };

  const exitCode = await run(
    ["list", "unread", "--limit", "2", "--tag", "ai"],
    {
      client,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {}
    }
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(JSON.parse(stdout), {
    data: [{ id: "abc", title: "Title", url: "https://example.com" }],
    hasMore: false,
    query: { list: "unread", tag: ["ai"], limit: 2 }
  });
});

test("returns usage error when token is missing for real client", async () => {
  const dir = await mkdtemp(join(tmpdir(), "goodlinks-cli-"));
  let stderr = "";
  const exitCode = await run(["tags"], {
    env: {},
    configPath: join(dir, "missing-config.json"),
    stdout: () => {},
    stderr: (text) => {
      stderr += text;
    }
  });

  assert.equal(exitCode, 3);
  assert.match(stderr, /Missing GoodLinks API token/);
});
