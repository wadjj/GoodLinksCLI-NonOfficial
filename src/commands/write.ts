import type {
  AddLinkBody,
  EditLinkBody,
  GoodLinksClient,
  LinkResource
} from "../goodlinks-client.js";
import { UsageError } from "../errors.js";
import { compactLink } from "../output.js";

type WriteClient = Pick<
  GoodLinksClient,
  "addLink" | "editLink" | "deleteLinks" | "getLinkById"
>;

export interface AddCommandOptions {
  title?: string;
  summary?: string;
  tag?: string[];
  read?: boolean;
  starred?: boolean;
  addedAt?: string;
}

export interface EditCommandOptions {
  title?: string;
  summary?: string;
  read?: boolean;
  starred?: boolean;
  addTag?: string[];
  removeTag?: string[];
  tags?: string[];
}

export interface DeleteCommandOptions {
  yes?: boolean;
}

export async function runAddCommand(
  client: WriteClient,
  url: string,
  options: AddCommandOptions = {}
): Promise<LinkResource> {
  validateSummary(options.summary);
  const body = dropUndefined({
    url,
    title: options.title,
    summary: options.summary,
    tags: options.tag,
    read: options.read,
    starred: options.starred,
    addedAt: options.addedAt
  }) as AddLinkBody;
  return client.addLink(body);
}

export async function runEditCommand(
  client: WriteClient,
  id: string,
  options: EditCommandOptions = {}
): Promise<LinkResource> {
  validateSummary(options.summary);
  const body = dropUndefined({
    title: options.title,
    summary: options.summary,
    read: options.read,
    starred: options.starred,
    addedTags: options.tags === undefined ? options.addTag : undefined,
    removedTags: options.tags === undefined ? options.removeTag : undefined,
    tags: options.tags
  }) as EditLinkBody;
  return client.editLink(id, body);
}

export async function runDeleteCommand(
  client: WriteClient,
  ids: string[],
  options: DeleteCommandOptions = {}
): Promise<
  | { deletedIds: string[] }
  | { dryRun: true; wouldDelete: Record<string, unknown>[] }
> {
  if (ids.length === 0) {
    throw new UsageError("delete requires at least one link id");
  }

  if (options.yes) {
    await client.deleteLinks(ids);
    return { deletedIds: ids };
  }

  const links = await Promise.all(ids.map((id) => client.getLinkById(id)));
  return {
    dryRun: true,
    wouldDelete: links.map((link) => compactLink(link))
  };
}

function validateSummary(summary: string | undefined): void {
  if (summary !== undefined && summary.length > 400) {
    throw new UsageError("summary must be 400 characters or fewer");
  }
}

function dropUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as Partial<T>;
}
