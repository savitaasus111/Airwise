import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serverConfig } from './config';

export function createRequestId(): string {
  return randomUUID();
}

function getRequestHostOrigin(request: Request): string | null {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return null;
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  // Same-origin GETs, SSR fetches, and server-side calls may omit Origin
  if (!origin) return true;

  const hostOrigin = getRequestHostOrigin(request);
  if (hostOrigin && origin === hostOrigin) return true;

  return serverConfig.allowedOrigins.includes(origin);
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Request-Id',
    'X-Content-Type-Options': 'nosniff',
  };

  if (origin && isOriginAllowed(request)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

export function handleCorsPreflight(request: Request): NextResponse {
  const requestId = createRequestId();
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { error: 'Origin not allowed.', requestId },
      { status: 403, headers: { 'X-Request-Id': requestId, 'X-Content-Type-Options': 'nosniff' } }
    );
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request),
      'X-Request-Id': requestId,
    },
  });
}

export function jsonOk<T>(
  request: Request,
  data: T,
  requestId: string,
  extraHeaders?: Record<string, string>,
  status = 200
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...getCorsHeaders(request),
      'X-Request-Id': requestId,
      ...extraHeaders,
    },
  });
}

export function jsonError(
  request: Request,
  status: number,
  genericMessage: string,
  requestId: string,
  extraHeaders?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    {
      error: genericMessage,
      requestId,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...getCorsHeaders(request),
        'X-Request-Id': requestId,
        ...extraHeaders,
      },
    }
  );
}

export type BodyReadResult =
  { ok: true; data: unknown } | { ok: false; status: 400 | 413 | 415; message: string };

/**
 * Reads a JSON request body while strictly enforcing:
 * 1) JSON Content-Type (blocking simple cross-site form POSTs)
 * 2) maxBytes UTF-8 size cap (default 50KB) before JSON parsing
 */
export async function readJsonBodyWithLimit(
  request: Request,
  maxBytes = serverConfig.maxBodyBytes
): Promise<BodyReadResult> {
  const contentType = request.headers.get('content-type');
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    return {
      ok: false,
      status: 415,
      message: 'Content-Type must be application/json.',
    };
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredBytes = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      return {
        ok: false,
        status: 413,
        message: 'Request payload exceeds maximum allowed size.',
      };
    }
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return { ok: false, status: 400, message: 'Unable to read request body.' };
  }

  const actualBytes = Buffer.byteLength(rawText, 'utf8');
  if (actualBytes > maxBytes) {
    return {
      ok: false,
      status: 413,
      message: 'Request payload exceeds maximum allowed size.',
    };
  }

  if (!rawText.trim()) {
    return { ok: false, status: 400, message: 'Request body must be valid JSON.' };
  }

  try {
    return { ok: true, data: JSON.parse(rawText) as unknown };
  } catch {
    return { ok: false, status: 400, message: 'Request body must be valid JSON.' };
  }
}

/**
 * Fetch wrapper with AbortController timeout for upstream third-party APIs.
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs = serverConfig.upstreamTimeoutMs
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
}
