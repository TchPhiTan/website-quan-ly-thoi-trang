let lastError: unknown;

export function captureError(error: unknown) {
  lastError = error;
}

export function consumeLastCapturedError(): unknown {
  const error = lastError;
  lastError = undefined;
  return error;
}
