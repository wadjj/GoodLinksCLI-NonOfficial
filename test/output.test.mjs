import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compactLink,
  projectFields,
  truncateText
} from "../dist/output.js";

test("projects explicit fields without inventing missing values", () => {
  assert.deepEqual(
    projectFields(
      { id: "1", title: "Title", url: "https://example.com", hidden: true },
      ["id", "title", "missing"]
    ),
    { id: "1", title: "Title" }
  );
});

test("compacts links to agent-friendly metadata", () => {
  assert.deepEqual(compactLink({ id: "1", title: "T", url: "u", body: "x" }), {
    id: "1",
    title: "T",
    url: "u"
  });
});

test("truncates text and reports whether truncation happened", () => {
  assert.deepEqual(truncateText("abcdef", 4), {
    text: "abcd",
    truncated: true
  });
  assert.deepEqual(truncateText("abc", 4), {
    text: "abc",
    truncated: false
  });
});

