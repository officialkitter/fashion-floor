import { mockRoute } from './mocks';

/**
 * Set this to the deployed Fashion Floor API URL.
 * When unset (or EXPO_PUBLIC_USE_MOCKS=true) the app runs against local mock data.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const USE_MOCKS = !BASE_URL || process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
  if (USE_MOCKS) return mockRoute<T>(path);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
    if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`);
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Request timed out');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
};
