import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

import {
  readStoredConfig,
  redactToken,
  writeStoredConfig
} from "../config.js";
import { UsageError } from "../errors.js";

export interface ConfigCommandOptions {
  configPath?: string;
}

export interface ConfigSetTokenOptions extends ConfigCommandOptions {
  token?: string;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

export async function runConfigSetTokenCommand(
  options: ConfigSetTokenOptions = {}
): Promise<{ saved: true; token: string | undefined }> {
  const token =
    options.token ??
    (await readHiddenLine({
      input: options.input ?? process.stdin,
      output: options.output ?? process.stdout,
      prompt: "GoodLinks API token: "
    }));

  if (!token.trim()) {
    throw new UsageError("Token cannot be empty");
  }

  const existing = await readStoredConfig(options.configPath);
  await writeStoredConfig(
    {
      ...existing,
      token: token.trim()
    },
    options.configPath
  );

  return {
    saved: true,
    token: redactToken(token.trim())
  };
}

export async function runConfigGetCommand(
  options: ConfigCommandOptions = {}
): Promise<Record<string, unknown>> {
  const stored = await readStoredConfig(options.configPath);
  const result: Record<string, unknown> = {};
  if (stored.baseUrl !== undefined) {
    result.baseUrl = stored.baseUrl;
  }
  if (stored.token !== undefined) {
    result.token = redactToken(stored.token);
  }
  if (stored.defaultFormat !== undefined) {
    result.defaultFormat = stored.defaultFormat;
  }
  if (stored.defaultContentFormat !== undefined) {
    result.defaultContentFormat = stored.defaultContentFormat;
  }
  if (stored.defaultMaxChars !== undefined) {
    result.defaultMaxChars = stored.defaultMaxChars;
  }
  return result;
}

async function readHiddenLine(options: {
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
  prompt: string;
}): Promise<string> {
  options.output.write(options.prompt);
  const mutedOutput = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    }
  });
  const rl = createInterface({
    input: options.input,
    output: mutedOutput,
    terminal: true
  });

  try {
    const answer = await rl.question("");
    options.output.write("\n");
    return answer;
  } finally {
    rl.close();
  }
}
