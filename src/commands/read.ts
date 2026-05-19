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
  allPages?: boolean;
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

export interface StatsCommandOptions {
  search?: string;
  tag?: string[];
  limit?: number;
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
  const { allPages, ...apiOptions } = options;
  const query = dropUndefined({ list, ...apiOptions }) as unknown as {
    list: string;
  } & ListCommandOptions;
  const result = options.allPages
    ? await collectAllPages((pageQuery) => client.listLinks({
        ...query,
        ...pageQuery
      }), options)
    : await client.listLinks(query);
  return {
    data: compactLinks(result.data),
    hasMore: result.hasMore,
    query: dropUndefined({ ...query, allPages }) as unknown as {
      list: string;
    } & ListCommandOptions
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
  const { query, allPages, ...rest } = options;
  const apiQuery = dropUndefined({
    ...rest,
    search: query ?? options.search
  }) as SearchCommandOptions;
  const result = options.allPages
    ? await collectAllPages((pageQuery) => client.searchLinks({
        ...apiQuery,
        ...pageQuery
      }), options)
    : ((await client.searchLinks(apiQuery)) as PagedResponse<LinkResource>);
  return {
    data: compactLinks(result.data),
    hasMore: result.hasMore,
    query: dropUndefined({ ...options, allPages })
  };
}

export async function runStatsCommand(
  client: ReadClient,
  options: StatsCommandOptions = {}
): Promise<Record<string, unknown>> {
  const query = dropUndefined(options) as StatsCommandOptions;
  const result = await collectAllPages((pageQuery) => client.searchLinks({
    ...query,
    ...pageQuery
  }), options);
  return summarizeLinks(result.data, query);
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

async function collectAllPages<T>(
  fetchPage: (query: { limit: number; offset: number }) => Promise<PagedResponse<T>>,
  options: { limit?: number; offset?: number } = {}
): Promise<PagedResponse<T>> {
  const limit = options.limit ?? 100;
  let offset = options.offset ?? 0;
  const data: T[] = [];

  while (true) {
    const page = await fetchPage({ limit, offset });
    data.push(...page.data);

    if (page.hasMore !== true || page.data.length === 0) {
      return { data, hasMore: false };
    }

    offset += limit;
  }
}

function summarizeLinks(
  links: LinkResource[],
  query: StatsCommandOptions
): Record<string, unknown> {
  const wordCounts = links
    .map((link) => link.wordCount)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  const tags = new Map<string, number>();
  let read = 0;
  let starred = 0;
  let highlighted = 0;

  for (const link of links) {
    if (link.readAt) {
      read += 1;
    }
    if (link.starred) {
      starred += 1;
    }
    if (link.highlighted) {
      highlighted += 1;
    }
    for (const tag of link.tags ?? []) {
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    }
  }

  return {
    total: links.length,
    query,
    counts: {
      read,
      unread: links.length - read,
      starred,
      highlighted
    },
    wordCount: {
      known: wordCounts.length,
      missing: links.length - wordCounts.length,
      sum: sum(wordCounts),
      average: average(wordCounts),
      min: wordCounts.at(0) ?? null,
      median: percentile(wordCounts, 0.5),
      p75: percentile(wordCounts, 0.75),
      p90: percentile(wordCounts, 0.9),
      max: wordCounts.at(-1) ?? null,
      buckets: {
        under500: countRange(wordCounts, 0, 499),
        from500To1999: countRange(wordCounts, 500, 1999),
        from2000To4999: countRange(wordCounts, 2000, 4999),
        from5000To9999: countRange(wordCounts, 5000, 9999),
        atLeast10000: wordCounts.filter((value) => value >= 10000).length
      }
    },
    tags: [...tags.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }))
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(sum(values) / values.length);
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }

  return values[Math.ceil(values.length * p) - 1];
}

function countRange(values: number[], min: number, max: number): number {
  return values.filter((value) => value >= min && value <= max).length;
}
