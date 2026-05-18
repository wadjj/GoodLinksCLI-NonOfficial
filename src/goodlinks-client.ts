import { ApiError, NetworkError } from "./errors.js";

export interface LinkResource {
  id: string;
  url: string;
  title?: string | null;
  summary?: string | null;
  author?: string | null;
  tags?: string[] | null;
  wordCount?: number | null;
  starred?: boolean;
  highlighted?: boolean;
  addedAt?: string;
  modifiedAt?: string;
  readAt?: string | null;
  [key: string]: unknown;
}

export interface HighlightResource {
  id: string;
  linkID: string;
  content: string;
  markdownContent?: string;
  note?: string | null;
  createdAt: string;
  [key: string]: unknown;
}

export interface PagedResponse<T> {
  data: T[];
  hasMore?: boolean;
  [key: string]: unknown;
}

export interface ListLinksOptions {
  list: string;
  search?: string;
  tag?: string[];
  includeRead?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchLinksOptions {
  search?: string;
  tag?: string[];
  starred?: boolean;
  read?: boolean;
  tagged?: boolean;
  highlighted?: boolean;
  wordCountMin?: number;
  wordCountMax?: number;
  addedAfter?: string;
  addedBefore?: string;
  readAfter?: string;
  readBefore?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface ContentOptions {
  format?: "html" | "plaintext" | "markdown";
  autoDownload?: boolean;
}

export interface AddLinkBody {
  url: string;
  title?: string;
  summary?: string;
  tags?: string[];
  read?: boolean;
  starred?: boolean;
  addedAt?: string;
}

export interface EditLinkBody {
  title?: string;
  summary?: string;
  starred?: boolean;
  read?: boolean;
  addedTags?: string[];
  removedTags?: string[];
  tags?: string[];
}

export interface SearchHighlightsOptions {
  q?: string;
  linkID?: string;
  content?: string;
  note?: string;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface GoodLinksClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}

type QueryValue = string | number | boolean | string[] | undefined;

export class GoodLinksClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GoodLinksClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getLists(): Promise<unknown> {
    return this.requestJson("GET", "/lists");
  }

  getTags(): Promise<string[]> {
    return this.requestJson("GET", "/tags");
  }

  listLinks(options: ListLinksOptions): Promise<PagedResponse<LinkResource>> {
    const { list, ...query } = options;
    return this.requestJson(
      "GET",
      `/lists/${encodeURIComponent(list)}`,
      query
    );
  }

  searchLinks(
    options: SearchLinksOptions = {}
  ): Promise<PagedResponse<LinkResource>> {
    return this.requestJson("GET", "/links", options as Record<string, QueryValue>);
  }

  getLinkById(id: string): Promise<LinkResource> {
    return this.requestJson("GET", `/links/${encodeURIComponent(id)}`);
  }

  getLinkByUrl(url: string): Promise<LinkResource> {
    return this.requestJson("GET", "/links", { url });
  }

  getContent(id: string, options: ContentOptions = {}): Promise<string> {
    return this.requestText("GET", `/links/${encodeURIComponent(id)}/content`, {
      format: options.format,
      autoDownload: options.autoDownload
    });
  }

  addLink(body: AddLinkBody): Promise<LinkResource> {
    return this.requestJson("POST", "/links", undefined, body);
  }

  editLink(id: string, body: EditLinkBody): Promise<LinkResource> {
    return this.requestJson(
      "PATCH",
      `/links/${encodeURIComponent(id)}`,
      undefined,
      body
    );
  }

  async deleteLinks(ids: string[]): Promise<void> {
    await this.requestEmpty("DELETE", "/links", { id: ids });
  }

  searchHighlights(
    options: SearchHighlightsOptions = {}
  ): Promise<PagedResponse<HighlightResource>> {
    return this.requestJson(
      "GET",
      "/highlights",
      options as Record<string, QueryValue>
    );
  }

  editHighlightNote(
    id: string,
    note: string
  ): Promise<HighlightResource> {
    return this.requestJson(
      "PATCH",
      `/highlights/${encodeURIComponent(id)}`,
      undefined,
      { note }
    );
  }

  exportHighlights(id: string): Promise<string> {
    return this.requestText(
      "GET",
      `/links/${encodeURIComponent(id)}/highlights/export`
    );
  }

  private async requestJson<T>(
    method: string,
    path: string,
    query?: Record<string, QueryValue>,
    body?: unknown
  ): Promise<T> {
    const response = await this.fetchResponse(method, path, query, body);
    return (await response.json()) as T;
  }

  private async requestText(
    method: string,
    path: string,
    query?: Record<string, QueryValue>,
    body?: unknown
  ): Promise<string> {
    const response = await this.fetchResponse(method, path, query, body);
    return response.text();
  }

  private async requestEmpty(
    method: string,
    path: string,
    query?: Record<string, QueryValue>,
    body?: unknown
  ): Promise<void> {
    await this.fetchResponse(method, path, query, body);
  }

  private async fetchResponse(
    method: string,
    path: string,
    query?: Record<string, QueryValue>,
    body?: unknown
  ): Promise<Response> {
    const url = this.buildUrl(path, query);
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.token}`
    };
    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch (error) {
      throw new NetworkError(`Unable to reach GoodLinks API at ${url}`, {
        cause: error instanceof Error ? error : undefined
      });
    }

    if (!response.ok) {
      throw await this.toApiError(response);
    }

    return response;
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, item);
        }
        continue;
      }

      url.searchParams.append(key, String(value));
    }

    return url.toString();
  }

  private async toApiError(response: Response): Promise<ApiError> {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: unknown;
      };
      return new ApiError(
        body.error ?? `GoodLinks API returned ${response.status}`,
        response.status,
        body.details
      );
    }

    const text = await response.text().catch(() => "");
    return new ApiError(
      text || `GoodLinks API returned ${response.status}`,
      response.status
    );
  }
}
