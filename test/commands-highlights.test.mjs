import assert from "node:assert/strict";
import { test } from "node:test";

import {
  runHighlightExportCommand,
  runHighlightNoteCommand,
  runHighlightSearchCommand
} from "../dist/commands/highlights.js";

test("highlight search forwards query options", async () => {
  const calls = [];
  const client = {
    async searchHighlights(options) {
      calls.push(options);
      return { data: [{ id: "h1", linkID: "abc", content: "quote", createdAt: "now" }] };
    }
  };

  const result = await runHighlightSearchCommand(client, {
    q: "agent",
    linkID: "abc",
    limit: 5
  });

  assert.deepEqual(calls, [{ q: "agent", linkID: "abc", limit: 5 }]);
  assert.equal(result.data[0].id, "h1");
});

test("highlight note clears notes with empty string", async () => {
  const calls = [];
  const client = {
    async editHighlightNote(id, note) {
      calls.push({ id, note });
      return { id, note };
    }
  };

  assert.deepEqual(await runHighlightNoteCommand(client, "h1", { clear: true }), {
    id: "h1",
    note: ""
  });
  assert.deepEqual(calls, [{ id: "h1", note: "" }]);
});

test("highlight export returns markdown content", async () => {
  const client = {
    async exportHighlights(id) {
      assert.equal(id, "abc");
      return "- quote";
    }
  };

  assert.deepEqual(await runHighlightExportCommand(client, "abc"), {
    id: "abc",
    markdown: "- quote"
  });
});

