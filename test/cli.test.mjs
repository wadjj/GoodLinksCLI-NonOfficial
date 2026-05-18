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

test("dispatches add command", async () => {
  let stdout = "";
  const client = {
    async addLink(body) {
      assert.deepEqual(body, {
        url: "https://example.com",
        tags: ["inbox"],
        starred: true
      });
      return { id: "abc", ...body };
    }
  };

  const exitCode = await run(
    ["add", "https://example.com", "--tag", "inbox", "--starred"],
    {
      client,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {}
    }
  );

  assert.equal(exitCode, 0);
  assert.equal(JSON.parse(stdout).id, "abc");
});

test("dispatches highlight export command", async () => {
  let stdout = "";
  const client = {
    async exportHighlights(id) {
      assert.equal(id, "abc");
      return "- quote";
    }
  };

  const exitCode = await run(["highlights", "export", "abc"], {
    client,
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {}
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(JSON.parse(stdout), { id: "abc", markdown: "- quote" });
});

test("dispatches config set-token and config get", async () => {
  const dir = await mkdtemp(join(tmpdir(), "goodlinks-cli-"));
  const configPath = join(dir, "config.json");
  let stdout = "";

  const setCode = await run(
    ["config", "set-token", "--token", "abcd1234efgh5678"],
    {
      configPath,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {}
    }
  );

  assert.equal(setCode, 0);
  assert.deepEqual(JSON.parse(stdout), {
    saved: true,
    token: "abcd...5678"
  });

  stdout = "";
  const getCode = await run(["config", "get"], {
    configPath,
    stdout: (text) => {
      stdout += text;
    },
    stderr: () => {}
  });

  assert.equal(getCode, 0);
  assert.deepEqual(JSON.parse(stdout), { token: "abcd...5678" });
});

test("supports fields projection and table output for list", async () => {
  let stdout = "";
  const client = {
    async listLinks() {
      return {
        data: [
          {
            id: "abc",
            title: "Title",
            url: "https://example.com"
          }
        ],
        hasMore: false
      };
    }
  };

  const exitCode = await run(
    ["list", "unread", "--fields", "id,title", "--table"],
    {
      client,
      stdout: (text) => {
        stdout += text;
      },
      stderr: () => {}
    }
  );

  assert.equal(exitCode, 0);
  assert.match(stdout, /id\s+title/);
  assert.match(stdout, /abc\s+Title/);
  assert.doesNotMatch(stdout, /example\.com/);
});
