import type { LinkResource } from "./goodlinks-client.js";

export const COMPACT_LINK_FIELDS = [
  "id",
  "title",
  "url",
  "summary",
  "author",
  "tags",
  "wordCount",
  "starred",
  "highlighted",
  "addedAt",
  "readAt"
] as const;

export type JsonObject = Record<string, unknown>;

export function projectFields<T extends JsonObject>(
  value: T,
  fields: string[]
): JsonObject {
  const projected: JsonObject = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      projected[field] = value[field];
    }
  }
  return projected;
}

export function compactLink(link: LinkResource): JsonObject {
  return projectFields(link, [...COMPACT_LINK_FIELDS]);
}

export function compactLinks(links: LinkResource[]): JsonObject[] {
  return links.map((link) => compactLink(link));
}

export function truncateText(
  text: string,
  maxChars: number
): { text: string; truncated: boolean } {
  if (maxChars < 0) {
    return { text, truncated: false };
  }

  if (text.length <= maxChars) {
    return { text, truncated: false };
  }

  return { text: text.slice(0, maxChars), truncated: true };
}

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function formatTable(rows: JsonObject[]): string {
  if (rows.length === 0) {
    return "";
  }

  const columns = Object.keys(rows[0]);
  const widths = columns.map((column) =>
    Math.max(
      column.length,
      ...rows.map((row) => stringifyCell(row[column]).length)
    )
  );
  const header = columns
    .map((column, index) => column.padEnd(widths[index]))
    .join("  ");
  const body = rows.map((row) =>
    columns
      .map((column, index) => stringifyCell(row[column]).padEnd(widths[index]))
      .join("  ")
  );

  return `${[header, ...body].join("\n")}\n`;
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(",");
  }

  return String(value);
}
