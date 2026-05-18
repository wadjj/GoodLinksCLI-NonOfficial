#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { resolveConfig, type ConfigEnv } from "./config.js";
import { ConfigError, exitCodeForError } from "./errors.js";
import { GoodLinksClient } from "./goodlinks-client.js";
import { formatJson } from "./output.js";
import {
  runContentCommand,
  runGetCommand,
  runListCommand,
  runSearchCommand,
  runTagsCommand
} from "./commands/read.js";
import {
  runAddCommand,
  runDeleteCommand,
  runEditCommand
} from "./commands/write.js";
import {
  runConfigGetCommand,
  runConfigSetTokenCommand
} from "./commands/config.js";
import {
  runHighlightExportCommand,
  runHighlightNoteCommand,
  runHighlightSearchCommand
} from "./commands/highlights.js";

const helpText = `GoodLinks CLI

Usage:
  goodlinks list <list> [--limit N] [--tag TAG]
  goodlinks search [query] [--limit N] [--tag TAG]
  goodlinks get <id-or-url> [--with-content]
  goodlinks content <id> [--format markdown] [--max-chars N]
  goodlinks add <url> [--tag TAG]
  goodlinks edit <id> [--add-tag TAG] [--remove-tag TAG]
  goodlinks delete <id...> [--yes]
  goodlinks config set-token [--token TOKEN]
  goodlinks config get
  goodlinks highlights search [query]
  goodlinks highlights note <highlight-id> [--note TEXT|--clear]
  goodlinks highlights export <link-id>
  goodlinks tags
  goodlinks doctor
  goodlinks --help
`;

type StdWriter = (text: string) => void;

export interface RunDependencies {
  client?: unknown;
  env?: ConfigEnv;
  configPath?: string;
  stdout?: StdWriter;
  stderr?: StdWriter;
}

interface ParsedArgs {
  positionals: string[];
  options: Record<string, string | boolean | string[]>;
}

export async function run(
  argv = process.argv.slice(2),
  deps: RunDependencies = {}
): Promise<number> {
  const stdout = deps.stdout ?? ((text) => process.stdout.write(text));
  const stderr = deps.stderr ?? ((text) => process.stderr.write(text));

  try {
    const parsed = parseCliArgs(argv);
    const [command, ...positionals] = parsed.positionals;

    if (
      parsed.options.help === true ||
      command === "--help" ||
      command === "-h" ||
      command === undefined
    ) {
      stdout(helpText);
      return 0;
    }

    if (command === "config") {
      const subcommand = requirePosition(positionals[0], "config command");
      if (subcommand === "set-token") {
        stdout(
          formatJson(
            await runConfigSetTokenCommand({
              token: stringOption(parsed.options.token),
              configPath: deps.configPath
            })
          )
        );
        return 0;
      }

      if (subcommand === "get") {
        stdout(
          formatJson(await runConfigGetCommand({ configPath: deps.configPath }))
        );
        return 0;
      }

      stderr(`Unknown config command: ${subcommand}\n`);
      return 2;
    }

    const client = await getClient(parsed.options, deps);

    if (command === "doctor") {
      await client.getTags();
      stdout(formatJson({ ok: true }));
      return 0;
    }

    if (command === "list") {
      const list = requirePosition(positionals[0], "list");
      const result = await runListCommand(client, list, {
        search: stringOption(parsed.options.search),
        tag: stringArrayOption(parsed.options.tag),
        includeRead: booleanOption(parsed.options.includeRead),
        limit: numberOption(parsed.options.limit),
        offset: numberOption(parsed.options.offset)
      });
      stdout(formatJson(result));
      return 0;
    }

    if (command === "search") {
      const result = await runSearchCommand(client, {
        query: positionals[0],
        tag: stringArrayOption(parsed.options.tag),
        starred: booleanOption(parsed.options.starred),
        read: booleanOption(parsed.options.read),
        tagged: booleanOption(parsed.options.tagged),
        highlighted: booleanOption(parsed.options.highlighted),
        wordCountMin: numberOption(parsed.options.wordCountMin),
        wordCountMax: numberOption(parsed.options.wordCountMax),
        addedAfter: stringOption(parsed.options.addedAfter),
        addedBefore: stringOption(parsed.options.addedBefore),
        readAfter: stringOption(parsed.options.readAfter),
        readBefore: stringOption(parsed.options.readBefore),
        sort: stringOption(parsed.options.sort),
        limit: numberOption(parsed.options.limit),
        offset: numberOption(parsed.options.offset)
      });
      stdout(formatJson(result));
      return 0;
    }

    if (command === "get") {
      const idOrUrl = requirePosition(positionals[0], "id-or-url");
      const result = await runGetCommand(client, idOrUrl, {
        withContent: booleanOption(parsed.options.withContent),
        contentFormat: contentFormatOption(parsed.options.contentFormat),
        autoDownload: booleanOption(parsed.options.autoDownload),
        maxChars: numberOption(parsed.options.maxChars)
      });
      stdout(formatJson(result));
      return 0;
    }

    if (command === "content") {
      const id = requirePosition(positionals[0], "id");
      const result = await runContentCommand(client, id, {
        format: contentFormatOption(parsed.options.format),
        autoDownload: booleanOption(parsed.options.autoDownload),
        maxChars: numberOption(parsed.options.maxChars)
      });
      stdout(formatJson(result));
      return 0;
    }

    if (command === "tags") {
      stdout(formatJson(await runTagsCommand(client)));
      return 0;
    }

    if (command === "add") {
      const url = requirePosition(positionals[0], "url");
      const result = await runAddCommand(client, url, {
        title: stringOption(parsed.options.title),
        summary: stringOption(parsed.options.summary),
        tag: stringArrayOption(parsed.options.tag),
        read: booleanOption(parsed.options.read),
        starred: booleanOption(parsed.options.starred),
        addedAt: stringOption(parsed.options.addedAt)
      });
      stdout(formatJson(result));
      return 0;
    }

    if (command === "edit") {
      const id = requirePosition(positionals[0], "id");
      const result = await runEditCommand(client, id, {
        title: stringOption(parsed.options.title),
        summary: stringOption(parsed.options.summary),
        read: booleanOption(parsed.options.read),
        starred: booleanOption(parsed.options.starred),
        addTag: stringArrayOption(parsed.options.addTag),
        removeTag: stringArrayOption(parsed.options.removeTag),
        tags: csvArrayOption(parsed.options.tags)
      });
      stdout(formatJson(result));
      return 0;
    }

    if (command === "delete") {
      const result = await runDeleteCommand(client, positionals, {
        yes: booleanOption(parsed.options.yes)
      });
      stdout(formatJson(result));
      return 0;
    }

    if (command === "highlights") {
      const subcommand = requirePosition(positionals[0], "highlights command");
      if (subcommand === "search") {
        const result = await runHighlightSearchCommand(client, {
          q: positionals[1] ?? stringOption(parsed.options.q),
          linkID: stringOption(parsed.options.linkId),
          content: stringOption(parsed.options.content),
          note: stringOption(parsed.options.note),
          createdAfter: stringOption(parsed.options.createdAfter),
          createdBefore: stringOption(parsed.options.createdBefore),
          sort: stringOption(parsed.options.sort),
          limit: numberOption(parsed.options.limit),
          offset: numberOption(parsed.options.offset)
        });
        stdout(formatJson(result));
        return 0;
      }

      if (subcommand === "note") {
        const id = requirePosition(positionals[1], "highlight-id");
        const result = await runHighlightNoteCommand(client, id, {
          note: stringOption(parsed.options.note),
          clear: booleanOption(parsed.options.clear)
        });
        stdout(formatJson(result));
        return 0;
      }

      if (subcommand === "export") {
        const id = requirePosition(positionals[1], "link-id");
        stdout(formatJson(await runHighlightExportCommand(client, id)));
        return 0;
      }

      stderr(`Unknown highlights command: ${subcommand}\n`);
      return 2;
    }

    stderr(`Unknown command: ${command}\n`);
    return 2;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stderr(`${message}\n`);
    return exitCodeForError(error);
  }
}

function parseCliArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, string | boolean | string[]> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = toCamelCase(rawKey);
    const next = argv[index + 1];
    const value =
      inlineValue ??
      (next !== undefined && !next.startsWith("--") ? argv[++index] : true);
    addOption(options, key, value);
  }

  return { positionals, options };
}

function addOption(
  options: Record<string, string | boolean | string[]>,
  key: string,
  value: string | boolean
): void {
  const existing = options[key];
  if (existing === undefined) {
    options[key] = value;
    return;
  }

  if (Array.isArray(existing)) {
    existing.push(String(value));
    return;
  }

  options[key] = [String(existing), String(value)];
}

async function getClient(
  options: Record<string, string | boolean | string[]>,
  deps: RunDependencies
): Promise<GoodLinksClient> {
  if (deps.client !== undefined) {
    return deps.client as GoodLinksClient;
  }

  const config = await resolveConfig({
    flags: {
      baseUrl: stringOption(options.baseUrl),
      token: stringOption(options.token)
    },
    env: deps.env,
    configPath: deps.configPath
  });

  if (!config.token) {
    throw new ConfigError(
      "Missing GoodLinks API token. Run `goodlinks config set-token` or set GOODLINKS_API_TOKEN."
    );
  }

  return new GoodLinksClient({
    baseUrl: config.baseUrl,
    token: config.token
  });
}

function requirePosition(value: string | undefined, name: string): string {
  if (value === undefined) {
    throw new ConfigError(`Missing required argument: ${name}`);
  }

  return value;
}

function stringOption(
  value: string | boolean | string[] | undefined
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.at(-1);
  }

  return undefined;
}

function stringArrayOption(
  value: string | boolean | string[] | undefined
): string[] | undefined {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return undefined;
}

function csvArrayOption(
  value: string | boolean | string[] | undefined
): string[] | undefined {
  const values = stringArrayOption(value);
  if (values === undefined) {
    return undefined;
  }

  return values.flatMap((item) =>
    item
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  );
}

function numberOption(
  value: string | boolean | string[] | undefined
): number | undefined {
  const stringValue = stringOption(value);
  return stringValue === undefined ? undefined : Number(stringValue);
}

function booleanOption(
  value: string | boolean | string[] | undefined
): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  const stringValue = stringOption(value);
  if (stringValue === undefined) {
    return undefined;
  }

  return stringValue === "true";
}

function contentFormatOption(
  value: string | boolean | string[] | undefined
): "html" | "plaintext" | "markdown" | undefined {
  const format = stringOption(value);
  if (format === "html" || format === "plaintext" || format === "markdown") {
    return format;
  }

  return undefined;
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run();
}
