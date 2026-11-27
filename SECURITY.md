# Security Policy & Architecture — AirWise

## 1. Security Architecture Overview

AirWise is a Next.js App Router web application that surfaces urban air quality telemetry (via Open-Meteo), provides optional Google Firebase Authentication & Cloud Firestore sync for household preferences, and generates personalized air-quality guidance via server-side Gemini API routes (`/api/plan` and `/api/chat`).

### Core Security Controls

1. **Server-Only Secrets & Safe Model Configuration**
   - `GEMINI_API_KEY` is accessed strictly on the server inside `lib/server/gemini.ts` and is never exposed via `NEXT_PUBLIC_*` variables or client bundles.
   - Startup model validation (`lib/server/config.ts`) checks `GEMINI_MODEL` against an explicit allowlist, redacts secret-like values (`[REDACTED]`) so accidentally pasted API keys are never echoed in server logs, and safely falls back to `gemini-4-hydrogen` instead of crashing the server.

2. **Strict Input Validation, CSRF Content-Type Guard & 50 KB Body Cap**
   - All API routes validate query parameters and JSON payloads with strict Zod schemas (`lib/server/schemas.ts`), enforcing explicit enums, numeric ranges, array length bounds, and string max lengths.
   - POST endpoints (`/api/plan`, `/api/chat`) enforce `Content-Type: application/json` (`415 Unsupported Media Type` on cross-site form POSTs) and a strict 50 KB UTF-8 body size limit (`413 Payload Too Large`) before JSON parsing (`readJsonBodyWithLimit` in `lib/server/http.ts`).
   - All API responses include `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and an opaque `X-Request-Id`. Internal `error.message` details and validation internals are logged server-side and never returned to clients.

3. **CORS Allowlist & Bounded Rate Limiting**
   - All API routes enforce an explicit Origin allowlist (`localhost:3000`, `127.0.0.1:3000`, `APP_URL`, and `ALLOWED_ORIGINS`, plus same-host requests) and return `403` for untrusted cross-origin requests.
   - Sliding-window per-IP rate limiting (`lib/rate-limit.ts`) applies stricter caps to AI endpoints (`/api/plan`: 12/min, `/api/chat`: 18/min) than telemetry reads (`/api/aqi`: 45/min, `/api/aqi/history`: 40/min), returning `429` with `Retry-After: 60`. The in-memory bucket table is hard-capped at `2000` active keys with oldest-key eviction to prevent memory exhaustion under spoofed-IP floods.

4. **Prompt-Injection Defense, Timeouts & Output Validation**
   - User questions and recent conversation history are length-capped, stripped of control characters, screened by `detectPromptInjection()`, and wrapped in explicit `<context_json>`, `<recent_conversation>`, and `<user_question>` delimiters with `<` and `>` characters neutralized (`neutralizePromptDelimiters`).
   - System prompts explicitly instruct the model to treat delimited text strictly as untrusted data and enforce health-safety boundaries (no outdoor running advice during AQI >= 151, no cloth-mask claims for PM2.5, no medical diagnoses/prescriptions, official CPCB/IMD/NDMA + 112/108 notices).
   - Structured JSON responses from `/api/plan` are parsed and validated against `DailyPlanOutputZod` via `callGeminiJsonWithFallback()`; malformed or invalid outputs seamlessly fall back to deterministic rule-based guidance.
   - Every Gemini and Open-Meteo request uses an `AbortController` timeout (`GEMINI_TIMEOUT_MS` default 15s; `UPSTREAM_TIMEOUT_MS` default 5s).

5. **HTTP Security Headers & Content Security Policy**
   - Configured in `next.config.ts`:
     - `Content-Security-Policy` restricting scripts, frames, objects, form actions, and external connections to `'self'`, Firebase Auth/Firestore, Google Identity, and Open-Meteo endpoints (plus `upgrade-insecure-requests` in production).
     - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`, `X-DNS-Prefetch-Control: off`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Cross-Origin-Resource-Policy: same-origin`, `Strict-Transport-Security`, and `poweredByHeader: false`.

6. **Database Access Control (Firestore Rules)**
   - `firestore.rules` enforces default-deny access, strict owner-only reads/writes on `/users/{userId}` and `/users/{userId}/actionLogs/{logId}`, field-level schema validation, and anonymous non-PII community summaries under `/communityGroups/{groupId}/contributions/{userId}`.

---

## 2. Dependency Audit Summary (`bun audit`)

Last audit checked against `bun.lock`: transitive advisories sit inside upstream framework/Firebase sub-dependencies (none in application code):

| Package                               | Severity       | Path                                       | Risk Assessment & Mitigation                                                                                                         |
| ------------------------------------- | -------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@grpc/grpc-js` (`<= 1.14.2`)         | High           | `firebase` -> `@firebase/firestore`        | Node gRPC transport inside Firebase SDK; AirWise runs Firestore in the browser over HTTPS/WebChannel, not a public Node gRPC server. |
| `minimatch` / `glob`                  | High           | `eslint` / `eslint-config-next` (dev-only) | Build/lint tooling only; never shipped to production runtime.                                                                        |
| `postcss` / `postcss-selector-parser` | Moderate       | Transitive build CSS pipeline              | Build-time only; AirWise never parses untrusted user CSS.                                                                            |
| `@opentelemetry/core` / `uuid`        | Moderate / Low | Transitive SDK telemetry packages          | Not exposed to untrusted input; monitor upstream Firebase/Next.js minor releases.                                                    |

---

## 3. Secret Hygiene Verification

- Verified zero hardcoded API keys, private keys, or secrets across `app/`, `components/`, `hooks/`, `lib/`, `tests/`, and `.env.example`.
- All environment variables are documented with placeholder values in `.env.example`.

## 4. Reporting a Vulnerability

If you discover a security issue in AirWise, please avoid posting exploit details publicly. Report the issue privately to the repository maintainer with reproduction steps, affected endpoint/component, and expected impact so a fix can be prepared and verified promptly.
