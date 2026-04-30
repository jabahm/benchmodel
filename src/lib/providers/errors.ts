// Translates raw provider/network errors into something user-readable.
export function describeNetworkError(err: unknown, baseUrl?: string): string {
  if (err instanceof Error) {
    const msg = err.message;
    const cause =
      'cause' in err && err.cause && typeof err.cause === 'object' ? (err.cause as { code?: string }) : null;
    const code = cause?.code;
    if (err.name === 'AbortError') {
      return `Request timed out${baseUrl ? ` reaching ${baseUrl}` : ''}.`;
    }
    if (code === 'ECONNREFUSED') {
      return `Connection refused${baseUrl ? ` at ${baseUrl}` : ''}. Is the service running?`;
    }
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      return `Could not resolve host${baseUrl ? ` ${baseUrl}` : ''}. Check the URL.`;
    }
    if (code === 'ECONNRESET') {
      return `Connection reset${baseUrl ? ` by ${baseUrl}` : ''}.`;
    }
    if (msg === 'fetch failed' || msg === 'Failed to fetch') {
      return `Could not reach the provider${baseUrl ? ` at ${baseUrl}` : ''}.`;
    }
    return msg;
  }
  return String(err);
}

const DEFAULT_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const ctrl = new AbortController();
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
