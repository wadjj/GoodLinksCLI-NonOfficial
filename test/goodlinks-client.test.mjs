import assert from "node:assert/strict";
import { test } from "node:test";

import { GoodLinksClient } from "../dist/goodlinks-client.js";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" }
  });
}

test("lists links with repeated tag params and bearer auth", async () => {
  const requests = [];
  const client = new GoodLinksClient({
    baseUrl: "http://localhost:9428/api/v1",
    token: "secret",
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return jsonResponse({ data: [{ id: "1", title: "A" }], total: 1 });
    }
  });

  const result = await client.listLinks({
    list: "unread",
    tag: ["ai", "product"],
    limit: 20,
    offset: 40
  });

  assert.equal(result.data[0].id, "1");
  assert.equal(
    requests[0].url,
    "http://localhost:9428/api/v1/lists/unread?tag=ai&tag=product&limit=20&offset=40"
  );
  assert.equal(requests[0].init.headers.authorization, "Bearer secret");
});

test("patches links with add and remove tags", async () => {
  const requests = [];
  const client = new GoodLinksClient({
    baseUrl: "http://localhost:9428/api/v1/",
    token: "secret",
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      return jsonResponse({ id: "abc", tags: ["ai"] });
    }
  });

  await client.editLink("abc", {
    summary: "short summary",
    addedTags: ["ai"],
    removedTags: ["inbox"]
  });

  assert.equal(requests[0].url, "http://localhost:9428/api/v1/links/abc");
  assert.equal(requests[0].init.method, "PATCH");
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    summary: "short summary",
    addedTags: ["ai"],
    removedTags: ["inbox"]
  });
});

test("fetches content as text and preserves markdown", async () => {
  const client = new GoodLinksClient({
    baseUrl: "http://localhost:9428/api/v1",
    token: "secret",
    fetchImpl: async (url) => {
      assert.equal(
        String(url),
        "http://localhost:9428/api/v1/links/abc/content?format=markdown&autoDownload=false"
      );
      return new Response("# Title\n\nBody", { status: 200 });
    }
  });

  assert.equal(
    await client.getContent("abc", { format: "markdown", autoDownload: false }),
    "# Title\n\nBody"
  );
});

test("throws ApiError for non-2xx responses", async () => {
  const client = new GoodLinksClient({
    baseUrl: "http://localhost:9428/api/v1",
    token: "bad",
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" }
      })
  });

  await assert.rejects(
    () => client.getTags(),
    (error) => error.name === "ApiError" && error.status === 401
  );
});
