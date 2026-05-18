import type {
  ContentOptions,
  GoodLinksClient,
  LinkResource,
  PagedResponse
} from "../goodlinks-client.js";
import { compactLinks, truncateText } from "../output.js";

type ReadClient = Pick<
  GoodLinksClient,
  "listLinks" | "searchLinks" | "getLinkById" | "getLinkByUrl" | "getContent" | "getTags"
>;

export interface ListCommandOptions {
  search?: string;
  tag?: string[];
  includeRead?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchCommandOptions extends ListCommandOptions {
  query?: string;
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
}

export interface GetCommandOptions {
  withContent?: boolean;
  contentFormat?: ContentOptions["format"];
  autoDownload?: boolean;
  maxChars?: number;
}

export interface ContentCommandOptions {
  format?: ContentOptions["format"];
  autoDownload?: boolean;
  maxChars?: number;
}

export async function runListCommand(
  client: ReadClient,
  list: string,
  options: ListCommandOptions
): Promise<{
  data: Record<string, unknown>[];
  hasMore?: boolean;
  query: { list: string } & ListCommandOptions;
}> {
  const query = dropUndefined({ list, ...options }) as unknown as {
    list: string;
  } & ListCommandOptions;
  const result = await client.listLinks(query);
  return {
    data: compactLinks(result.data),
    hasMore: result.hasMore,
    query
  };
}

export async function runSearchCommand(
  client: ReadClient,
  options: SearchCommandOptions
): Promise<{
  data: Record<string, unknown>[];
  hasMore?: boolean;
  query: SearchCommandOptions;
}> {
  const { query, ...rest } = options;
  const apiQuery = dropUndefined({ ...rest, search: query ?? options.search });
  const result = (await client.searchLinks(
    apiQuery
  )) as PagedResponse<LinkResource>;
  return {
    data: compactLinks(result.data),
    hasMore: result.hasMore,
    query: dropUndefined(options)
  };
}

export async function runGetCommand(
  client: ReadClient,
  idOrUrl: string,
  options: GetCommandOptions = {}
): Promise<Record<string, unknown>> {
  const link = idOrUrl.startsWith("http://") || idOrUrl.startsWith("https://")
    ? await client.getLinkByUrl(idOrUrl)
    : await client.getLinkById(idOrUrl);

  const result: Record<string, unknown> = { ...link };
  if (options.withContent) {
    const format = options.contentFormat ?? "markdown";
    const content = await client.getContent(link.id, {
      format,
      autoDownload: options.autoDownload
    });
    const truncated =
      options.maxChars === undefined
        ? { text: content, truncated: false }
        : truncateText(content, options.maxChars);
    result.content = truncated.text;
    result.contentFormat = format;
    result.truncated = truncated.truncated;
  }

  return result;
}

export async function runContentCommand(
  client: ReadClient,
  id: string,
  options: ContentCommandOptions = {}
): Promise<{
  id: string;
  format: ContentOptions["format"];
  content: string;
  truncated: boolean;
}> {
  const format = options.format ?? "markdown";
  const content = await client.getContent(id, {
    format,
    autoDownload: options.autoDownload
  });
  const truncated =
    options.maxChars === undefined
      ? { text: content, truncated: false }
      : truncateText(content, options.maxChars);
  return {
    id,
    format,
    content: truncated.text,
    truncated: truncated.truncated
  };
}

export async function runTagsCommand(client: ReadClient): Promise<string[]> {
  return client.getTags();
}

function dropUndefined(value: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  );
}
