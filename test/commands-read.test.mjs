import assert from "node:assert/strict";
import { test } from "node:test";

import {
  runContentCommand,
  runListCommand,
  runTagsCommand
} from "../dist/commands/read.js";

test("list command returns compact JSON-ready data", async () => {
  const calls = [];
  const client = {
    async listLinks(options) {
      calls.push(options);
      return {
        data: [
          {
            id: "abc",
            title: "Title",
            url: "https://example.com",
            body: "not returned"
          }
        ],
        hasMore: false
      };
    }
  };

  const result = await runListCommand(client, "unread", {
    limit: 2,
    tag: ["ai"]
  });

  assert.deepEqual(calls, [{ list: "unread", limit: 2, tag: ["ai"] }]);
  assert.deepEqual(result, {
    data: [{ id: "abc", title: "Title", url: "https://example.com" }],
    hasMore: false,
    query: { list: "unread", limit: 2, tag: ["ai"] }
  });
});

test("content command returns truncated JSON-ready content", async () => {
  const calls = [];
  const client = {
    async getContent(id, options) {
      calls.push({ id, options });
      return "abcdef";
    }
  };

  const result = await runContentCommand(client, "abc", {
    format: "markdown",
    autoDownload: false,
    maxChars: 4
  });

  assert.deepEqual(calls, [
    { id: "abc", options: { format: "markdown", autoDownload: false } }
  ]);
  assert.deepEqual(result, {
    id: "abc",
    format: "markdown",
    content: "abcd",
    truncated: true
  });
});

test("tags command returns tags", async () => {
  const client = {
    async getTags() {
      return ["ai", "product"];
    }
  };

  assert.deepEqual(await runTagsCommand(client), ["ai", "product"]);
});

