import assert from "node:assert/strict";
import { test } from "node:test";

import {
  runContentCommand,
  runListCommand,
  runSearchCommand,
  runStatsCommand,
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

test("list command can collect all pages", async () => {
  const calls = [];
  const pages = [
    { data: [{ id: "a", title: "A", url: "https://a.example" }], hasMore: true },
    { data: [{ id: "b", title: "B", url: "https://b.example" }], hasMore: false }
  ];
  const client = {
    async listLinks(options) {
      calls.push(options);
      return pages.shift();
    }
  };

  const result = await runListCommand(client, "all", {
    limit: 1,
    allPages: true
  });

  assert.deepEqual(calls, [
    { list: "all", limit: 1, offset: 0 },
    { list: "all", limit: 1, offset: 1 }
  ]);
  assert.deepEqual(result.data.map((link) => link.id), ["a", "b"]);
  assert.equal(result.hasMore, false);
  assert.equal(result.query.allPages, true);
});

test("search command can collect all pages", async () => {
  const calls = [];
  const pages = [
    { data: [{ id: "a", title: "A", url: "https://a.example" }], hasMore: true },
    { data: [], hasMore: false }
  ];
  const client = {
    async searchLinks(options) {
      calls.push(options);
      return pages.shift();
    }
  };

  const result = await runSearchCommand(client, {
    query: "agent",
    tag: ["topic/ai"],
    limit: 1,
    allPages: true
  });

  assert.deepEqual(calls, [
    { tag: ["topic/ai"], search: "agent", limit: 1, offset: 0 },
    { tag: ["topic/ai"], search: "agent", limit: 1, offset: 1 }
  ]);
  assert.deepEqual(result.data.map((link) => link.id), ["a"]);
});

test("stats command summarizes metadata without reading content", async () => {
  const calls = [];
  const client = {
    async searchLinks(options) {
      calls.push(options);
      return {
        data: [
          {
            id: "a",
            wordCount: 400,
            tags: ["topic/ai", "source/blog"],
            readAt: "2026-05-18T00:00:00Z",
            starred: true,
            highlighted: false
          },
          {
            id: "b",
            wordCount: 2500,
            tags: ["topic/ai"],
            readAt: null,
            starred: false,
            highlighted: true
          },
          {
            id: "c",
            tags: [],
            readAt: null
          }
        ],
        hasMore: false
      };
    },
    async getContent() {
      throw new Error("stats must not read content");
    }
  };

  const result = await runStatsCommand(client, { limit: 100 });

  assert.deepEqual(calls, [{ limit: 100, offset: 0 }]);
  assert.equal(result.total, 3);
  assert.deepEqual(result.counts, {
    read: 1,
    unread: 2,
    starred: 1,
    highlighted: 1
  });
  assert.deepEqual(result.wordCount.buckets, {
    under500: 1,
    from500To1999: 0,
    from2000To4999: 1,
    from5000To9999: 0,
    atLeast10000: 0
  });
  assert.equal(result.wordCount.missing, 1);
  assert.deepEqual(result.tags, [
    { tag: "topic/ai", count: 2 },
    { tag: "source/blog", count: 1 }
  ]);
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

test("content command does not truncate by default", async () => {
  const longContent = "x".repeat(12001);
  const client = {
    async getContent() {
      return longContent;
    }
  };

  const result = await runContentCommand(client, "abc", {
    format: "markdown"
  });

  assert.equal(result.content.length, 12001);
  assert.equal(result.truncated, false);
});

test("tags command returns tags", async () => {
  const client = {
    async getTags() {
      return ["ai", "product"];
    }
  };

  assert.deepEqual(await runTagsCommand(client), ["ai", "product"]);
});
