export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class NetworkError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NetworkError";
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function exitCodeForError(error: unknown): number {
  if (error instanceof UsageError) {
    return 2;
  }

  if (error instanceof ConfigError) {
    return 3;
  }

  if (error instanceof NetworkError) {
    return 4;
  }

  if (error instanceof ApiError) {
    return 5;
  }

  return 1;
}
