import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export const DEFAULT_BASE_URL = "http://localhost:9428/api/v1";

export interface ConfigFlags {
  baseUrl?: string;
  token?: string;
}

export interface ConfigEnv {
  GOODLINKS_API_BASE_URL?: string;
  GOODLINKS_API_TOKEN?: string;
}

export interface GoodLinksConfig {
  baseUrl: string;
  token?: string;
  defaultFormat: "json" | "table" | "md";
  defaultContentFormat: "markdown" | "plaintext" | "html";
  defaultMaxChars: number | null;
}

export interface StoredConfig {
  baseUrl?: string;
  token?: string;
  defaultFormat?: "json" | "table" | "md";
  defaultContentFormat?: "markdown" | "plaintext" | "html";
  defaultMaxChars?: number | null;
}

export interface ResolveConfigOptions {
  flags?: ConfigFlags;
  env?: ConfigEnv;
  configPath?: string;
}

export function defaultConfigPath(): string {
  return join(homedir(), ".config", "goodlinks-cli", "config.json");
}

export function redactToken(token: string | undefined): string | undefined {
  if (token === undefined) {
    return undefined;
  }

  if (token.length < 12) {
    return "<redacted>";
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export async function readStoredConfig(
  configPath = defaultConfigPath()
): Promise<StoredConfig> {
  try {
    const raw = await readFile(configPath, "utf8");
    return JSON.parse(raw) as StoredConfig;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {};
    }

    throw error;
  }
}

export async function writeStoredConfig(
  config: StoredConfig,
  configPath = defaultConfigPath()
): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
}

export async function resolveConfig(
  options: ResolveConfigOptions = {}
): Promise<GoodLinksConfig> {
  const flags = options.flags ?? {};
  const env = options.env ?? process.env;
  const stored = await readStoredConfig(options.configPath);

  return {
    baseUrl:
      flags.baseUrl ??
      env.GOODLINKS_API_BASE_URL ??
      stored.baseUrl ??
      DEFAULT_BASE_URL,
    token: flags.token ?? env.GOODLINKS_API_TOKEN ?? stored.token,
    defaultFormat: stored.defaultFormat ?? "json",
    defaultContentFormat: stored.defaultContentFormat ?? "markdown",
    defaultMaxChars: stored.defaultMaxChars ?? null
  };
}
