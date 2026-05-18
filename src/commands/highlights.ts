import type {
  GoodLinksClient,
  HighlightResource,
  PagedResponse,
  SearchHighlightsOptions
} from "../goodlinks-client.js";
import { UsageError } from "../errors.js";

type HighlightClient = Pick<
  GoodLinksClient,
  "searchHighlights" | "editHighlightNote" | "exportHighlights"
>;

export interface HighlightNoteOptions {
  note?: string;
  clear?: boolean;
}

export async function runHighlightSearchCommand(
  client: HighlightClient,
  options: SearchHighlightsOptions = {}
): Promise<PagedResponse<HighlightResource>> {
  return client.searchHighlights(dropUndefined(options) as SearchHighlightsOptions);
}

export async function runHighlightNoteCommand(
  client: HighlightClient,
  id: string,
  options: HighlightNoteOptions
): Promise<HighlightResource> {
  const note = options.clear ? "" : options.note;
  if (note === undefined) {
    throw new UsageError("highlight note requires --note or --clear");
  }

  return client.editHighlightNote(id, note);
}

export async function runHighlightExportCommand(
  client: HighlightClient,
  id: string
): Promise<{ id: string; markdown: string }> {
  return {
    id,
    markdown: await client.exportHighlights(id)
  };
}

function dropUndefined(value: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  );
}
