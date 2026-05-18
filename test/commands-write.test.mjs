import assert from "node:assert/strict";
import { test } from "node:test";

import {
  runAddCommand,
  runDeleteCommand,
  runEditCommand
} from "../dist/commands/write.js";

test("add command sends link metadata and tags", async () => {
  const calls = [];
  const client = {
    async addLink(body) {
      calls.push(body);
      return { id: "abc", ...body };
    }
  };

  const result = await runAddCommand(client, "https://example.com", {
    title: "Title",
    summary: "Short",
    tag: ["inbox", "topic/ai"],
    read: false,
    starred: true
  });

  assert.deepEqual(calls, [
    {
      url: "https://example.com",
      title: "Title",
      summary: "Short",
      tags: ["inbox", "topic/ai"],
      read: false,
      starred: true
    }
  ]);
  assert.equal(result.id, "abc");
});

test("edit command rejects summaries over 400 characters", async () => {
  const client = {
    async editLink() {
      throw new Error("should not call API");
    }
  };

  await assert.rejects(
    () => runEditCommand(client, "abc", { summary: "x".repeat(401) }),
    /summary must be 400 characters or fewer/
  );
});

test("delete command defaults to dry-run and fetches metadata", async () => {
  const calls = [];
  const client = {
    async getLinkById(id) {
      calls.push(["get", id]);
      return { id, title: `Title ${id}`, url: `https://example.com/${id}` };
    },
    async deleteLinks(ids) {
      calls.push(["delete", ids]);
    }
  };

  const result = await runDeleteCommand(client, ["abc", "def"], {
    yes: false
  });

  assert.deepEqual(calls, [
    ["get", "abc"],
    ["get", "def"]
  ]);
  assert.deepEqual(result, {
    dryRun: true,
    wouldDelete: [
      { id: "abc", title: "Title abc", url: "https://example.com/abc" },
      { id: "def", title: "Title def", url: "https://example.com/def" }
    ]
  });
});

test("delete command deletes only when yes is true", async () => {
  const calls = [];
  const client = {
    async getLinkById() {
      throw new Error("should not fetch metadata on confirmed delete");
    },
    async deleteLinks(ids) {
      calls.push(ids);
    }
  };

  assert.deepEqual(await runDeleteCommand(client, ["abc"], { yes: true }), {
    deletedIds: ["abc"]
  });
  assert.deepEqual(calls, [["abc"]]);
});

