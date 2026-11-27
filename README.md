# AirWise — GenAI-Powered Urban Air Quality Assistant

AirWise helps families, children, commuters, and neighborhoods navigate urban air pollution and winter smog by turning live AQI, pollutant telemetry, and 7-to-90-day air quality trends into clear, explainable daily routines, indoor air hacks, mask guidance, habit impact tracking, and community clean-air challenges.

---

## 1. Problem & Target Audience

- **Problem**: Urban residents often see a single AQI number without knowing _when_ it is safest to step outside, _how_ to protect children, elders, or asthmatic family members indoors on a budget, or _whether_ air quality is actually improving over time.
- **Audience**: Families, parents, commuters, elders, and neighborhood groups (EN & हिन्दी / Devanagari) seeking calm, science-grounded environmental guidance that works immediately without mandatory sign-in and remains usable offline.
- **Safety Boundary**: Every AI and rule-based recommendation is clearly labeled as general environmental guidance—not medical advice—and directs users to follow official **CPCB / IMD / NDMA** advisories and dial **112 / 108** in a breathing emergency.

---

## 2. Architecture Overview

```
Browser (PWA · React 19 · Tailwind CSS v4 · Recharts · EN/HI i18n · Offline Cache)
   │
   ├── GET  /api/health                  ──► Runtime model health + X-Request-Id
   ├── GET  /api/aqi?city=&lat=&lon=     ──► CORS + Rate Limit + LRU Cache ──► Open-Meteo AQI & Weather
   │                                                                           (Deterministic fallback)
   ├── GET  /api/aqi/history?lat=&lon=   ──► CORS + Zod Date Validation    ──► Open-Meteo Historical AQI
   │                                                                           (7d/14d/30d/custom up to 90d)
   ├── POST /api/plan                    ──► 415 JSON + 50KB Cap + Zod     ──► Gemini (gemini-4-hydrogen)
   │                                         + LRU Cache + AbortController     Strict JSON + Rule fallback
   ├── POST /api/chat                    ──► 415 JSON + Injection Guard    ──► Gemini (gemini-4-hydrogen)
   │                                         + Delimiter Isolation + Timeout   Live AQI + Household context
   └── Firebase Auth (Google Sign-In) & Cloud Firestore (Optional)
        ├── /users/{uid}                                (Owner-only private household profile)
        ├── /users/{uid}/actionLogs/{logId}             (Owner-only clean-air habit logs)
        └── /communityGroups/{groupId}/contributions    (Zero-PII anonymized leaderboard)
```

---

## 3. Modular Folder Structure

```
/
├── app/
│   ├── api/
│   │   ├── health/route.ts               # Health probe & validated Gemini model status
│   │   ├── aqi/route.ts                  # Cached, rate-limited Open-Meteo AQI + 48h forecast
│   │   ├── aqi/history/route.ts          # Cached historical PM2.5 & AQI trends (up to 90 days)
│   │   ├── plan/route.ts                 # Structured Gemini daily plan + Zod + rule fallback
│   │   └── chat/route.ts                 # Injection-hardened grounded family assistant
│   ├── globals.css                       # Tailwind v4 + WCAG high-contrast :focus-visible
│   └── page.tsx                          # SSR entry point
├── components/
│   ├── AirWiseApp.tsx                    # App shell, skip-link, landmarks, offline banner
│   ├── LazyViews.tsx                     # Dynamic code-split imports for heavy tabs & modal
│   ├── NowDashboard.tsx + now/*          # Right-now summary, alerts, Chart/Text Table toggle
│   ├── HistoryView.tsx + history/*       # Recharts trends, Date Range Picker, custom tooltips
│   ├── DailyPlanView.tsx + plan/*        # Tailored routine, indoor hacks, per-member table
│   ├── AssistantView.tsx                 # Grounded Q&A chat with aria-live log
│   ├── ImpactTrackerView.tsx             # Weekly PM2.5/CO2/PM tracker & habit streak
│   ├── CommunityView.tsx                 # WAI-ARIA keyboard Tabs & zero-PII leaderboard
│   └── HouseholdProfileModal.tsx         # 4-step profile modal with focus trap & Delete Data
├── hooks/
│   ├── use-airwise-state.ts              # Core interactive state & action handlers
│   ├── use-airwise-sync.ts               # LocalStorage hydration, DOM sync & Firebase sync
│   ├── use-history-range.ts              # Debounced historical range fetch & validation
│   ├── use-dialog-a11y.ts                # Reusable focus trap, Escape close & focus restore
│   └── use-pwa.ts                        # PWA install prompt & online/offline status
├── lib/
│   ├── aqi-bands.ts                      # Pure AQI bands, inversion risk & outdoor windows
│   ├── impact-stats.ts                   # Streak math, text sanitization & injection screen
│   ├── daily-plan-fallback.ts            # Deterministic bilingual EN/HI fallback planner
│   ├── history-analytics.ts              # Daily aggregation, trend & tooltip delta math
│   ├── rate-limit.ts                     # Bounded sliding-window per-IP rate limiter
│   └── server/                           # config, cache, http, schemas, prompts, gemini, fallbacks
├── tests/
│   ├── server-and-logic.test.ts          # Vitest unit, security, AI safety & API route suite
│   ├── components.test.tsx               # React Testing Library + axe-core WCAG 2.2 AA suite
│   └── e2e/smoke.mjs                     # Live HTTP smoke verification script
├── docs/ci-workflow.example.yml              # CI: format, lint, typecheck, coverage >=80%, build
├── SECURITY.md                           # Security controls & dependency audit notes
└── SCORECARD.md                          # Measured 6-criterion engineering scorecard
```

---

## 4. Environment Variables

Copy `.env.example` to `.env.local`:

| Variable              | Required | Default                 | Description                                                                                                                                                                                        |
| --------------------- | -------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`      | Optional | —                       | Server-only Gemini API key (rule-based fallback works automatically if omitted).                                                                                                                   |
| `GEMINI_MODEL`        | Optional | `gemini-4-hydrogen`     | Allowed Gemini model ID (`gemini-4-hydrogen`, `gemini-4-neon`, `gemini-4-carbon`, `gemini-4-argon`, `gemini-3.1-flash-lite`). Invalid values safely fall back without crashing or leaking secrets. |
| `APP_URL`             | Optional | `http://localhost:3000` | Public deployment origin added to the API CORS allowlist.                                                                                                                                          |
| `ALLOWED_ORIGINS`     | Optional | —                       | Comma-separated extra CORS origins.                                                                                                                                                                |
| `MAX_BODY_BYTES`      | Optional | `51200`                 | Maximum JSON POST body size in bytes (50 KB).                                                                                                                                                      |
| `GEMINI_TIMEOUT_MS`   | Optional | `15000`                 | `AbortController` timeout for Gemini API calls.                                                                                                                                                    |
| `UPSTREAM_TIMEOUT_MS` | Optional | `5000`                  | `AbortController` timeout for Open-Meteo requests.                                                                                                                                                 |

---

## 5. Setup, Testing & Verification

```bash
npm install
npm run dev              # Starts Next.js on http://localhost:3000

# Full quality & security gate (same as docs/ci-workflow.example.yml)
npm run format:check     # Prettier formatting check (0 warnings)
npm run lint             # ESLint + Firestore security rules plugin (0 warnings)
npm run typecheck        # Strict TypeScript check (0 errors)
npm run test:coverage    # Vitest + RTL + axe-core + v8 coverage (>=80% threshold)
npm run test:node        # Node native test runner verification (34 tests)
npm run build            # Production build
npm run test:smoke       # Live HTTP smoke check against running server
```

---

## 6. Accessibility Statement (WCAG 2.2 AA)

- Semantic HTML landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`), skip-to-main-content link, one `<h1>` per active view, and `<th scope="col">` + `<caption>` on all data tables.
- Full keyboard support across navigation, WAI-ARIA `tablist`/`tabpanel` controls (`ArrowLeft`, `ArrowRight`, `Home`, `End`), dialogs (focus trap, `Escape` close, focus restoration via `useDialogA11y`), and visible high-contrast `:focus-visible` outlines.
- Charts include descriptive `role="img"` labels and an accessible **Chart / Text Table** view toggle on the Now forecast card, plus daily breakdowns on the History tab.
- Respects `prefers-reduced-motion` (`MotionConfig reducedMotion="user"`), never conveys AQI status by color alone (paired with distinct geometric icons & text labels), updates `<html lang="en|hi">` dynamically, and passes automated `axe-core` tests with **0 violations**.

---

## 7. Data Transparency & Limitations

- **Live Telemetry & Fallback**: Live AQI and historical trends come from Open-Meteo; if Open-Meteo is unreachable, AirWise transparently displays deterministic demo winter-smog fallback data.
- **Demo Community Groups**: Seeded neighborhood challenge entries in the Community tab are explicitly labeled _"Includes demo community data"_ until live Firebase community contributions are synced.
- **Approximate Impact Estimates**: Avoided PM2.5 exposure and CO2/PM savings in the Daily Plan and Impact Tracker are educational approximations with explicit assumptions—not clinical dosimetry.
