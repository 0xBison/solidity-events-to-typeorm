export function logMessage(message: string) {
  if (process.env.LOGGING_ENABLED === 'true') {
    logMessage(message);
  }
}
