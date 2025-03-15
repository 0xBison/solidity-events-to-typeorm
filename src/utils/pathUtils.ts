import path from 'path';

/**
 * Gets the caller's file path by analyzing the stack trace
 */
function getCallerFile(): string {
  // Capture stack trace
  const oldLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 30;
  const err = new Error();
  Error.stackTraceLimit = oldLimit;

  // Parse stack trace
  const stack = err.stack?.split('\n') || [];

  // Find the first file path outside this library
  for (let i = 1; i < stack.length; i++) {
    const match = stack[i].match(
      /at\s+(?:Object\.|Module\.|)(?:\w+\s+\()?(.+?):[0-9]+:[0-9]+\)?/,
    );
    if (!match || !match[1]) continue;

    const filePath = match[1];

    // Skip paths from node internals and this library
    if (
      filePath.startsWith('node:') ||
      filePath.includes('internal/') ||
      filePath.includes(__dirname) ||
      filePath.includes('node_modules/ts-node')
    ) {
      continue;
    }

    return filePath;
  }

  // Fallback to working directory as last resort
  return process.cwd();
}

/**
 * Gets the directory of the caller script
 */
export function getCallerDir(): string {
  const callerFile = getCallerFile();
  return path.dirname(callerFile);
}

/**
 * Normalizes config paths to be absolute based on the caller's location
 */
export function normalizeConfigPaths<T extends { output: { path: string } }>(
  config: T,
): T {
  const callerDir = getCallerDir();

  // Clone the config to avoid mutating it
  const normalizedConfig = JSON.parse(JSON.stringify(config));

  // Process main output path
  if (!path.isAbsolute(normalizedConfig.output.path)) {
    normalizedConfig.output.path = path.resolve(
      callerDir,
      normalizedConfig.output.path,
    );
  }

  // Process other paths if they exist
  if (normalizedConfig.artifacts) {
    if (Array.isArray(normalizedConfig.artifacts.includePaths)) {
      normalizedConfig.artifacts.includePaths =
        normalizedConfig.artifacts.includePaths.map((p: string) =>
          !path.isAbsolute(p) ? path.resolve(callerDir, p) : p,
        );
    }

    if (Array.isArray(normalizedConfig.artifacts.excludePaths)) {
      normalizedConfig.artifacts.excludePaths =
        normalizedConfig.artifacts.excludePaths.map((p: string) =>
          !path.isAbsolute(p) ? path.resolve(callerDir, p) : p,
        );
    }
  }

  return normalizedConfig;
}
