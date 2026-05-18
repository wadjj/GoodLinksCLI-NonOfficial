import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ApiError,
  ConfigError,
  NetworkError,
  UsageError,
  exitCodeForError
} from "../dist/errors.js";

test("maps known errors to stable exit codes", () => {
  assert.equal(exitCodeForError(new UsageError("bad args")), 2);
  assert.equal(exitCodeForError(new ConfigError("missing token")), 3);
  assert.equal(exitCodeForError(new NetworkError("offline")), 4);
  assert.equal(exitCodeForError(new ApiError("unauthorized", 401)), 5);
  assert.equal(exitCodeForError(new Error("boom")), 1);
});

