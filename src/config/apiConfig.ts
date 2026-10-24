import { Capacitor } from '@capacitor/core';

/**
 * Default hosted Render backend URL for native Android APK requests
 */
export const DEFAULT_HOSTED_BACKEND_URL =
  'https://amader-songothon-backup-1.onrender.com';

/**
 * Returns the effective API base URL.
 * - In Web browsers: returns '' (relative URLs like '/api/...').
 * - In Native Android APK: returns VITE_API_BASE_URL (if provided) or fallback to DEFAULT_HOSTED_BACKEND_URL.
 */
export function getApiBaseUrl(): string {
  const envUrl = (((import.meta as any).env?.VITE_API_BASE_URL as string) || '').trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  if (Capacitor.isNativePlatform()) {
    return DEFAULT_HOSTED_BACKEND_URL;
  }
  return '';
}

/**
 * Installs a transparent fetch interceptor that prefixes '/api/*' endpoints
 * with the hosted backend URL when running inside native Android APK.
 * In desktop/mobile Web browsers, it leaves window.fetch completely untouched.
 */
export function initApiRouting(): void {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return; // Browser environment: keep standard native relative fetch
  }

  const nativeFetch = window.fetch;
  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (typeof input === 'string') {
      if (input.startsWith('/api/')) {
        input = `${baseUrl}${input}`;
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api/')) {
        input = new URL(`${baseUrl}${input.pathname}${input.search}`);
      }
    } else if (input instanceof Request) {
      const url = new URL(input.url, window.location.href);
      if (url.pathname.startsWith('/api/')) {
        const rewritten = `${baseUrl}${url.pathname}${url.search}`;
        input = new Request(rewritten, input);
      }
    }

    return nativeFetch.call(this, input, init);
  };
}
