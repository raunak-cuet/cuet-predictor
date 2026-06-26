# DreamSeat — Complete Platform Context Document

> **Purpose of this document:** Give any AI assistant (or human developer) complete inside-out knowledge of this entire codebase. After reading this, you should be able to understand, modify, debug, or extend any part of the platform without asking clarifying questions about architecture, data flow, or business logic.

---

## TABLE OF CONTENTS

1. [What DreamSeat Is](#1-what-dreamseat-is)
2. [Tech Stack & Infrastructure](#2-tech-stack--infrastructure)
3. [File Tree & Every File Explained](#3-file-tree--every-file-explained)
4. [Data Architecture](#4-data-architecture)
5. [The Prediction Engine — Complete Technical Breakdown](#5-the-prediction-engine)
6. [Composite Score Formulas — Every Program Type](#6-composite-score-formulas)
7. [Cutoff Projection Algorithm](#7-cutoff-projection-algorithm)
8. [Probability Calculation](#8-probability-calculation)
9. [User Flow — Step by Step](#9-user-flow)
10. [The Results Page — Every Component](#10-the-results-page)
11. [Admin Panel](#11-admin-panel)
12. [Maintenance Mode System](#12-maintenance-mode-system)
13. [Search & Relevance Scoring](#13-search--relevance-scoring)
14. [Seat Data & Zero-Seats Handling](#14-seat-data--zero-seats-handling)
15. [Subject System](#15-subject-system)
16. [CUET 2026 Statistical Data](#16-cuet-2026-statistical-data)
17. [Name Validation](#17-name-validation)
18. [Dev Bypass (Secret)](#18-dev-bypass)
19. [Deployment & Environment](#19-deployment--environment)
20. [Database Schema](#20-database-schema)
21. [Known Design Decisions & Trade-offs](#21-known-design-decisions--trade-offs)
22. [CSS & Design System](#22-css--design-system)

---

## 1. What DreamSeat Is

**DreamSeat** is a web application that predicts Delhi University (DU) undergraduate admission chances for students who took the CUET (UG) 2026 exam.

### What it solves:
- Students get CUET scores but have NO idea what cutoff DU will set in 2026
- Students don't know which of the 1,526 DU programs they're eligible for
- Students don't know how to arrange their CSAS (Common Seat Allocation System) preference list
- No existing tool computes program-specific composite scores using the correct DU formulas

### What it does:
1. Student enters their CUET subjects (up to 5) and NTA normalised scores
2. Engine computes composite scores for every eligible DU program using the correct formula
3. Engine projects 2026 cutoffs from 2025 Round 1 cutoffs using a 12-factor model
4. Engine calculates admission probability using a sigma-anchored logistic model
5. Results are ranked and displayed with visual breakdowns, what-if sliders, AIR calculator

### Coverage:
- **1,526 programs** across **67 DU colleges**
- **6 reservation categories**: UR (General), OBC-NCL, SC, ST, EWS, PwBD
- **38 CUET subjects**: 13 languages + 24 domain subjects + GAT
- **29 distinct composite formula types** matching DU 2026 eligibility criteria

### Owner/Creator:
- Built by **Raunak Pandey** with AI assistance
- Published as a live website (deployed on Vercel)
- Brand name: **DreamSeat**

---

## 2. Tech Stack & Infrastructure

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14** (App Router) |
| Language | JavaScript (ES modules in lib/, 'use client' in pages) |
| Styling | **Tailwind CSS 3.4** + custom CSS in `globals.css` |
| Fonts | Inter (body) + Instrument Serif (display headings) via Google Fonts |
| Database | **Supabase** (PostgreSQL) — stores submissions only |
| Hosting | **Vercel** (production deployment) |
| Analytics | Vercel Analytics + Speed Insights |
| Package Manager | npm |

### Key architectural decisions:
- **All prediction logic runs server-side** in the `/api/submit` route — the engine never runs in the browser
- **No client-side Supabase** — all DB operations go through API routes using the service role key
- **Static data (programs, cutoffs, formulas)** lives in `lib/programs.data.json` — shipped as part of the bundle, not fetched from DB
- **Session-based results** — after submission, results are stored in `sessionStorage` and read by the results page. No server-side session.
- **No authentication for students** — anyone can use it. Only the admin panel requires a password.

---

## 3. File Tree & Every File Explained

```
cuet-predictor/
├── app/                          # Next.js App Router pages
│   ├── layout.js                 # Root layout: navbar, footer, fonts, analytics
│   ├── page.js                   # HOME PAGE: subject picker, score entry, dream college selector
│   ├── globals.css               # All CSS: design tokens, card styles, ticker, disclaimer, bars
│   ├── results/
│   │   └── page.js               # RESULTS PAGE: dream report, all programs, AIR calculator
│   ├── how-to-use/
│   │   └── page.js               # Static "How to Use" guide with accordions
│   ├── maintenance/
│   │   └── page.js               # Static maintenance landing page
│   ├── admin/
│   │   └── page.js               # Admin dashboard (password-protected)
│   ├── components/
│   │   ├── Logo.js               # DreamSeat wordmark (CSS/SVG sparkle)
│   │   └── UpdateNotice.js       # Update banner + first-time popup (localStorage-driven)
│   └── api/
│       ├── submit/
│       │   └── route.js          # POST: validates input → runs engine → saves to Supabase → returns results
│       ├── maintenance-status/
│       │   └── route.js          # GET: reads maintenance toggle from Supabase settings table
│       └── admin/
│           ├── entries/
│           │   └── route.js      # GET: returns all submissions (password-protected)
│           ├── delete/
│           │   └── route.js      # POST: delete one or all submissions
│           └── maintenance/
│               └── route.js      # GET/POST: read/toggle maintenance mode + set bypass cookie
│
├── lib/                          # Core engine & data
│   ├── engine.js                 # MASTER ENGINE: orchestrates composite → projection → probability
│   ├── composite.js              # COMPOSITE SCORE ENGINE: 29 formula types for DU programs
│   ├── predict.js                # PREDICTION ENGINE: cutoff projection + logistic probability
│   ├── cuet2026.js               # STATISTICAL DATA: NTA press release numbers (pool sizes, max scores, appeared counts)
│   ├── subjects.js               # Subject taxonomy: 38 subjects with codes, names, groups
│   ├── subjects.data.json        # Simple code→name mapping (used for display)
│   ├── programs.data.json        # THE BIG DATA FILE: 1,526 programs with formulas, 2025 cutoffs, 2026 seats
│   ├── supabase.js               # Supabase client factory (service role only, server-side only)
│   └── validateName.js           # Name validation: anti-spam, anti-gibberish, anti-keyboard-mashing
│
├── data/                         # Source/reference data (not imported by live code)
│   ├── cutoffs_2025.json         # Raw 2025 cutoff data
│   ├── DU_cutoffs_2025_round1.json  # 2025 Round 1 cutoffs (structured)
│   ├── programs.json             # Source program list (used to generate programs.data.json)
│   ├── seats_entrance.json       # Entrance-based seat data
│   ├── subjects.json             # Subject mapping reference
│   ├── du_ug_2026_27_website_data.json      # 2026-27 seat matrix (full)
│   ├── du_ug_2026_27_website_data.min.json  # 2026-27 seat matrix (minified)
│   └── cutoff2025.pdf            # Original PDF of 2025 cutoffs
│
├── public/                       # Static assets
│   ├── favicon.ico, favicon-16.png, favicon-32.png
│   ├── apple-touch-icon.png
│   ├── dreamseat-wordmark.png
│   ├── stars-icon.png, stars-icon-rounded.png
│
├── supabase/
│   └── schema.sql                # Database schema (submissions, outcomes, settings tables)
│
├── middleware.js                  # Edge middleware: maintenance mode routing
├── next.config.js                # Next.js config
├── package.json                  # Dependencies
├── tailwind.config.js            # Tailwind config with brand colors
├── postcss.config.js             # PostCSS (autoprefixer)
├── jsconfig.json                 # Path aliases (@/ → project root)
├── .env.example                  # Environment variables template
└── .gitignore
```

---

## 4. Data Architecture

### Primary data file: `lib/programs.data.json`

A JSON array of 1,526 objects. Each represents one college-program combination:

```json
{
  "id": 1,
  "college": "Acharya Narendra Dev College",
  "program": "B.Com (Hons.)",
  "cutoff_2025": {
    "UR": 741.7355,
    "OBC": 591.5148,
    "SC": 509.7383,
    "ST": 307.3793,
    "EWS": 629.8035,
    "PwBD": 364.8609
  },
  "formula": {
    "type": "BCOM_HONS",
    "components": ["BEST_LANG", "BEST_3_COMMERCE"],
    "desc": "1 Language + 3 best from {Accountancy, Business Studies, Mathematics, Economics}"
  },
  "seats": {
    "UR": 50, "SC": 19, "ST": 9, "OBC": 34, "EWS": 13, "PwBD": 6
  }
}
```

**Key fields:**
- `cutoff_2025`: Round 1 cutoff by category (null if no allocation happened — common for PwBD/ST)
- `formula.type`: Determines which composite calculation logic to use (see §6)
- `seats`: 2026-27 seat matrix by category. `null` for ~12 programs where data is unavailable. `0` for a category means no reserved seats exist.

### Statistical data: `lib/cuet2026.js`

Contains NTA press release numbers that drive the projection engine:
- `POOL`: Total registered/appeared candidates (2025 vs 2026)
- `CATEGORY_POOL`: Category-wise appeared counts
- `SUBJECT_STATS`: Per-subject appeared count + highest NTA score for 2025 and 2026
- `TOP_DENSITY`: 100-percentile holders count, top aggregate scores

---

## 5. The Prediction Engine

### Flow: `lib/engine.js` → `runEngine({ scores, category })`

```
For each of 1,526 programs:
  1. computeComposite(formula, scores)     → composite score + outOf + used subjects
     ↓ if not eligible, skip
  2. Look up cutoff_2025[category]         → base cutoff (with fallback for PwBD/ST)
     ↓ if no cutoff data at all, skip
  3. projectCutoff(cutoff2025, prog, cat)  → projected 2026 cutoff + sigma + range
  4. admissionProbability(composite, proj)  → probability + verdict
  5. Push to results array

Sort results by probability DESC
Return array
```

### Fallback logic for missing cutoffs:
- **PwBD**: Falls back through ST → SC → OBC → EWS → UR, applies 0.55 discount factor
- **ST**: Falls back through SC → OBC → EWS → UR, applies 0.88 discount factor
- If no cutoff found at all, the program is skipped entirely

### Seats handling:
- Full seats object (`{ UR, SC, ST, OBC, EWS, PwBD }`) is passed to each result
- When category has 0 reserved seats and UR has positive seats, UR count is used for probability calculation (with a guard: UR must be > 0)
- The UI shows a warning when seats are 0

---

## 6. Composite Score Formulas

`lib/composite.js` — 29 formula types. Here is every single one:

### 4-subject formulas (out of 1000):

| Type | Rule | Programs |
|------|------|----------|
| `BFIA` | 1 Lang + Math + 1 best Domain (not Math) + GAT | BBA(FIA) — 2 programs |
| `BMS_BBE` | 1 Lang + Math + 1 best Domain (not Math) + GAT | BMS, BBE — 19 programs |
| `BCOM_HONS` | 1 Lang + (Math OR Acc) + 2 best other Domain | B.Com Hons — 55 programs |
| `BCOM_PROG` | 1 Lang + (Math OR Acc) + 2 best other Domain | B.Com — 44 programs |
| `BA_ECO` | 1 Lang + Math + 2 best other Domain | B.A. Hons Economics — 40 programs |
| `BA_MATH` | 1 Lang + Math + 2 best other Domain | B.A. Hons Mathematics — same formula |
| `BA_ENG` | English + 3 best Domain | B.A. Hons English — 48 programs |
| `BA_HINDI` | Hindi + 3 best Domain | B.A. Hons Hindi — 52 programs |
| `BA_SANSKRIT` | 1 Lang + 3 best Domain | B.A. Hons Sanskrit — 30 programs |
| `BA_HONS_GEN` | 1 Lang + 3 best Domain | Generic B.A. Hons (Pol Sci, History, Psychology, etc.) — 180 programs |
| `BSC_MATH_STATS` / `BSC_CS` / `BSC_MATH_SCI` | 1 Lang + Math + 2 best other Domain | B.Sc Hons Math, Statistics, CS, Prog Mathematical Sci — 76 programs (fall-through case) |

### 3-subject formulas (out of 750, language required for CUET but NOT in merit):

| Type | Rule | Programs |
|------|------|----------|
| `BSC_PCM` | Physics + Chemistry + Math | B.Sc Hons Physics, Chemistry — 50 programs |
| `BSC_BIO` | Physics + Chemistry + Biology | B.Sc Hons Bio Sci, Botany, Zoology, Biomedical, Microbiology — 67 programs |
| `BSC_BIOCHEM` | Chemistry + Biology + (Physics OR Math) | B.Sc Hons Bio-Chemistry — 6 programs |
| `BSC_ELEC_INSTRU` | Physics + Math + (Chemistry OR CS) | B.Sc Hons Electronics, Instrumentation — 15 programs |
| `BSC_PHYSICAL_CHEM` | Physics + Math + Chemistry | B.Sc Prog Physical Science w/ Chemistry — 26 programs |
| `BSC_PHYSICAL_PROG` | Physics + Math + (Chemistry OR CS) | B.Sc Prog Physical Science w/ Electronics/CS — 25 programs |
| `BSC_ENV_FOOD` | Physics + Chemistry + (Biology OR Math) | B.Sc Hons Environmental Sci, Food Tech — 5 programs |
| `BSC_GEOLOGY` | Physics + Chemistry + (Math OR Geography OR Biology) | B.Sc Hons Geology — 2 programs |
| `BSC_POLYMER` | Physics + Chemistry + Math | B.Sc Hons Polymer Science — 1 program |
| `BSC_HS` | Biology + (Physics OR Chemistry) + 1 best other Domain | B.Sc Hons Home Science — 5 programs |
| `BSC_ANTHRO` | Physics + Chemistry + Biology | B.Sc Hons Anthropology — 1 program |
| `BSC_LIFE` | Chemistry + Physics + Biology | B.Sc Prog Life Science — same as BSC_BIO but semantically separate |
| `BTECH_IT` | 1 Lang + Math + GAT | B.Tech IT & MI — 1 program |

### Variable-subject formulas:

| Type | Rule | Programs |
|------|------|----------|
| `BA_PROG` | Best of: (1L+3D) OR (2L+2D) OR (1L+1D+GAT) | B.A. Program — 754 programs |
| `BSC_HS_PASS` | Same as BA_PROG (best of 3 combinations) | B.Sc Pass Home Science — 2 programs |
| `BVOC` | 1 Lang + 3 best Domain | B.Voc programs — 11 programs |
| `BELED` | 1 Lang + 3 best Domain | B.El.Ed — 8 programs |
| `JOURN` | 1 Lang + 3 best Domain | Delhi School of Journalism — 1 program |
| `BSC_GENERIC` | 1 Lang + 3 best Domain | Catch-all for remaining B.Sc — very few left |

### Important notes:
- For 3-subject B.Sc formulas, a language is REQUIRED for CUET eligibility but does NOT count in the merit composite. The student must have taken at least 1 language, but the merit score = only the 3 science subjects (out of 750).
- For 4-subject formulas (BCOM, BA, BSC_MATH_STATS etc.), the language IS part of the merit composite (out of 1000).

---

## 7. Cutoff Projection Algorithm

`lib/predict.js` → `projectCutoff(cutoff2025, programInfo, category, usedCodes)`

### Five adjustment factors:

**A. Scale Adjustment (fraction-of-max preservation)**
- Converts 2025 cutoff to 2026 scale: `scaledCutoff = (cutoff2025 / max2025) × max2026`
- For BFIA/BMS where formula changed from 3→4 subjects, uses the 2025 formula's max (3-subject)
- `max` = sum of actual highest NTA scores for each subject in the formula

**B. Competition Drift**
- Pool growth = 70% category-specific + 30% overall
- Elasticity = 0.12 for competitive programs (cutoff > 75% of max), 0.08 otherwise
- Ceiling dampening: linear 1.0→0.0 as cutoff goes from 85%→95% of max
- `competitionDelta = scaledCutoff × blendedGrowth × effectiveElasticity`

**C. Top-End Density (elite programs only)**
- Triggered when `fractionOfMax > 0.85` (program is elite)
- Based on 100-percentile holder growth (~20% YoY)
- Adds 2-8 marks to elite cutoffs

**D. Seat Scarcity**
- `< 15 seats`: +1.2% of max
- `< 30 seats`: +0.6% of max
- `> 80 seats`: -0.4% of max (large pools are stable)

**E. Physical Ceiling Cap**
- Cutoff capped at 95% of formula max (no DU cutoff has ever exceeded this)

### Sigma (uncertainty band):
- Base: 1.0% (top-elite, >93% of max), 1.5% (elite), 2.5% (general)
- +1.5% if formula changed (BFIA/BMS)
- +2.0% × (1 - data coverage) for missing 2026 max-score data
- +0.5% for < 15 seats, +0.25% for < 30 seats
- Minimum: 8 marks

### Output:
```js
{
  mostLikely: 847.23,      // point estimate
  conservative: 838.54,    // point - sigma
  aggressive: 855.92,      // point + sigma
  sigma: 8.69,
  factors: [...],           // detailed breakdown of each factor
  confidence: 80,           // 0-90 scale
  base2025: 831.0,
  formulaMax26: 989.22,
  fractionOfMax25: 84.01,
  tier: 'elite',
  formulaChanged: false,
  coverage: 100
}
```

---

## 8. Probability Calculation

`lib/predict.js` → `admissionProbability(studentScore, projection, seatsInCategory)`

### Core formula:
```
margin = studentScore - projection.mostLikely
k = ln(3) / sigma
P = 1 / (1 + exp(-k × margin))
```

### Why k = ln(3)/σ:
- Derived so that P(margin = +σ) = 75% (one sigma above = very strong chance)
- P(margin = 0) = 50% (at cutoff = coin flip)
- P(margin = -σ) = 25% (one sigma below = difficult)
- **No free parameters.** No arbitrary steepness.

### Seat-scarcity sharpening:
- k is scaled by `√(40 / max(seats, 5))`
- Clamped to [0.85, 1.3] multiplier
- Small seat pools = small score differences are more decisive

### Range:
- `pLow` = probability if actual cutoff lands at projection.aggressive (worst case)
- `pHigh` = probability if actual cutoff lands at projection.conservative (best case)
- Probability clamped to [1%, 99%] — never claims certainty

### Verdicts:
| Probability | Label | Emoji | Tone |
|------------|-------|-------|------|
| ≥ 95% | Extremely Likely | 🟢 | safe |
| ≥ 80% | Very Strong | 🟢 | safe |
| ≥ 60% | Strong Chance | 🔵 | good |
| ≥ 40% | Competitive | 🟡 | mid |
| ≥ 20% | Difficult | 🟠 | risk |
| < 20% | Reach | 🔴 | reach |

---

## 9. User Flow — Step by Step

### Home Page (`app/page.js`):

1. **Step 1 — Pick Subjects**: Chip-based selector for 38 CUET subjects. Enforces rules: max 5 total, max 2 languages, max 1 GAT. Blocked chips are greyed out.

2. **Step 2 — Enter Scores**: For each selected subject, a number input (0-250) appears. Supports decimals matching NTA precision.

3. **Step 3 — Category**: Radio buttons for UR, OBC-NCL, SC, ST, EWS, PwBD.

4. **Step 4 — Name**: Text input with live validation (see §17).

5. **Step 5 — Dream College** (optional): Searchable dropdown. Only shows programs the student is eligible for based on their subjects. Uses relevance-scored search (see §13). Renders as a portal-based dropdown that escapes all stacking contexts.

6. **Submit**: POST to `/api/submit` → engine runs → results saved to Supabase + returned → stored in `sessionStorage` → redirect to `/results`.

### Results Page (`app/results/page.js`):

1. **Hero**: Shows name, category, total eligible programs
2. **Subject Scorecard**: Visual cards for each subject with score, max, percentile, bar
3. **Dream College Report**: Full deep-dive if dream was selected (see §10)
4. **AIR Calculator**: Enter percentiles → get subject-level All India Ranks
5. **Important Disclaimer**: Prominent, beautifully-styled legal disclaimer
6. **All Eligible Programs**: Filterable, sortable, searchable list with result cards

---

## 10. The Results Page — Every Component

### SubjectBreakdown
- Card per subject: score, /250, highest 2026 score, percentage of max, color-coded bar
- Total composite card with sum

### DreamReport
- College name, program, category, seats info
- Zero-seats warning if applicable (amber box)
- 5 KPI tiles: Composite | 2025 Cutoff (actual) | Est. 2026 | Seats | Probability
- Score positioning bar (your score vs cutoff range)
- Interactive what-if slider (-100 to +100 marks)
- Change dream college (inline searchable selector)
- Factor reveal (expandable: shows every projection factor)
- Probability explanation (expandable: shows the math)

### ResultCard (for each eligible program)
- College + program name, rank number, verdict badge
- Probability bar (visual)
- Mini position bar (score vs cutoff)
- 4 stats: Composite | 2025 Cutoff | Est. 2026 | Margin
- Zero-seats warning if applicable
- What-if slider
- Factor reveal (expandable)

### AllResults
- Filters: Safe (75%+), Moderate (50-75%), Risky (<50%), All
- Course type filter (dropdown of all unique programs)
- Sort: Probability, Best Match (when searching), Name, Score
- Search: Relevance-scored (see §13)
- Pagination: Load 50 at a time

### AirCalculator
- Per-subject percentile input
- Calculates: AIR = (100 - percentile) / 100 × appeared
- Shows confidence band (±5 rank from percentile truncation)
- Tier badges: Top 100, Top 500, Top 1K, Top 5K, etc.

---

## 11. Admin Panel

`app/admin/page.js` — 675 lines, password-protected client-side dashboard.

### Login:
- Password compared via API call to `/api/admin/entries?password=...`
- Default password: `CUET_ADMIN@#$118` (overridable via `ADMIN_PASSWORD` env var)
- Stored in `sessionStorage` for session persistence

### Features:
- **Summary stats**: Total submissions, today's count, most popular dream college, average composite
- **Full submissions table**: Sortable, filterable, searchable. Shows name, category, scores, dream college, composite, probability, timestamp
- **Entry detail modal**: Click any row to see full score breakdown
- **Delete**: Single entry or wipe all (with confirmation)
- **Auto-refresh**: 30-second polling with countdown timer
- **Maintenance toggle**: Turn maintenance mode on/off (see §12)

### APIs used:
- `GET /api/admin/entries?password=...` — fetch all submissions
- `POST /api/admin/delete` — delete single (`{ password, id }`) or all (`{ password, all: true }`)
- `GET /api/admin/maintenance?password=...` — check maintenance state
- `POST /api/admin/maintenance` — toggle maintenance (`{ password, enabled: true/false }`)

---

## 12. Maintenance Mode System

### Components:
1. **`middleware.js`** (Edge Runtime) — intercepts all requests
2. **`/api/maintenance-status`** — reads toggle from Supabase `settings` table
3. **`/api/admin/maintenance`** — admin read/write for the toggle
4. **`/maintenance`** — the "We'll be right back" static page

### How it works:
- Middleware checks if maintenance is ON (env var override OR Supabase `settings.maintenance_mode`)
- Result is cached in-memory for 10 seconds (avoids DB hammering)
- If ON: all requests are rewritten to `/maintenance` EXCEPT:
  - `/admin`, `/api/admin/*`, `/maintenance`, `/_next/*`, favicons
  - Requests with the `ds_bypass` cookie matching the admin password
- Admin gets bypass cookie set automatically on login via `Set-Cookie: ds_bypass=<admin_password>; HttpOnly; Secure; SameSite=Lax`

### Emergency override:
- Set `MAINTENANCE_MODE=true` in environment variables to force maintenance without DB

---

## 13. Search & Relevance Scoring

Used in three places:
1. Home page dream college selector
2. Results page "Change dream college" selector
3. Results page "All eligible programs" filter

### Algorithm:
```
normalizeSearch(str):
  lowercase → remove .,()[]/\&+- → collapse whitespace

abbreviate(str):
  collapse "b a" → "ba" (single-letter words joined)

relevanceScore(result, query, tokens):
  1. Exact match bonus: +1000 (college = query)
  2. Prefix match bonus: +700-800 (college starts with query)
  3. All-tokens-present bonus: +400
  4. Per-token bonus: +10 × min(token.length, 4) per field
  5. Shorter match preference: -0.02 × total field length
```

### Why this matters:
- Searching "shri ram college" ranks **SRCC** above **Lady Shri Ram** (prefix match wins)
- Searching "ba economics" matches "B.A. (Hons.) Economics" (abbreviation collapsing)
- Searching by college name prioritizes college-level matches over program-level

---

## 14. Seat Data & Zero-Seats Handling

### Data source:
- 2026-27 seat matrix from `du_ug_2026_27_website_data.json` (uploaded by owner)
- Matched to programs using fuzzy college+course name matching
- 1,514 of 1,526 programs have seat data

### Seat structure per program:
```json
{ "UR": 50, "SC": 19, "ST": 9, "OBC": 34, "EWS": 13, "PwBD": 6 }
```

### Zero seats handling:
- When `seats[category] === 0`: student's selected category has NO reserved seats at this college
- **UI**: Shows amber warning box explaining they must compete through UR/General
- **Engine**: Uses UR seat count for probability calculation (guarded: only if UR > 0)
- **Special PwBD note**: "PwBD candidates may also be eligible through other reserved categories if applicable"

---

## 15. Subject System

`lib/subjects.js` — 38 subjects in 3 groups:

### Languages (List A) — codes 101-113:
English (101), Hindi (102), Assamese (103), Bengali (104), Gujarati (105), Kannada (106), Malayalam (107), Marathi (108), Odia (109), Punjabi (110), Tamil (111), Telugu (112), Urdu (113)

### Domain (List B) — codes 301-326:
Accountancy (301), Agriculture (302), Anthropology (303), Biology (304), Business Studies (305), Chemistry (306), Environmental Science (307), Computer Science (308), Economics (309), Fine Arts (312), Geography (313), History (314), Home Science (315), Knowledge Tradition (316), Mass Media (318), Mathematics (319), Performing Arts (320), Physical Education (321), Physics (322), Political Science (323), Psychology (324), Sanskrit (325), Sociology (326)

### GAT — code 501:
General Aptitude Test

### CUET 2026 selection rules (enforced in UI):
- Max 5 subjects total
- Max 2 languages
- Max 1 GAT
- No cap on domain subjects (besides total 5)

---

## 16. CUET 2026 Statistical Data

`lib/cuet2026.js` — all numbers from official NTA press releases.

### Key 2026 numbers:
- **Registered**: 15,68,867 (+15.8% from 2025)
- **Appeared**: 11,64,098 (+8.6%)
- **Top aggregate**: 1,232.19 (5 subjects)
- **100-percentile in 1 subject**: 3,214 candidates

### Category pool (appeared):
| Category | 2025 | 2026 | Growth |
|----------|------|------|--------|
| UR | 4,75,051 | 4,98,652 | +5.0% |
| OBC | 3,59,264 | 4,01,471 | +11.7% |
| SC | 1,14,751 | 1,28,871 | +12.3% |
| ST | 62,354 | 67,245 | +7.8% |
| EWS | 60,315 | 67,859 | +12.5% |
| PwBD | 4,354 | 5,033 | +15.6% |

---

## 17. Name Validation

`lib/validateName.js` — comprehensive anti-spam system.

### Checks (in order):
1. Type & emptiness
2. Length (max 80)
3. Allowed characters (Unicode letters, spaces, hyphens, apostrophes, periods)
4. Minimum 2 letters
5. Non-Latin fast path (allows non-Latin scripts with basic repeat check)
6. Vowel requirement (at least one vowel for Latin names)
7. Per-word structural checks (no 3+ identical consecutive letters, no 4+ consecutive vowels, no 5+ consecutive consonants)
8. Vowel ratio (15-70% for names ≥ 6 chars)
9. Keyboard mashing detection (qwerty, asdf, etc.)
10. Repeated trigram detection
11. Placeholder names (test, sample, admin, asdf, etc.)
12. Known fake names (John Doe, Mickey Mouse, etc.)
13. Character diversity (min unique chars for longer names)

---

## 18. Dev Bypass (Secret)

In `app/page.js` — triggered by pressing **Ctrl+Shift+K three times** within 1.2 seconds on the home page.

### What it fills:
- Name: "Raunak Pandey"
- Category: UR
- Subjects: English (101), Business Studies (305), Economics (309), Mathematics (319), GAT (501)
- Scores: 216.07, 228.02, 234.96, 219.43, 194.41
- Dream: Shaheed Sukhdev College — BBA(FIA)

### How it works:
- `useEffect` listens for `keydown` events
- Ref counter (`devTapRef`) tracks rapid Ctrl+Shift+K presses
- On 3rd press, all state setters fire
- Dream college is set via `setTimeout(100ms)` to let `eligibleProgramsForSubjects` recompute after subjects change

---

## 19. Deployment & Environment

### Vercel deployment:
- Auto-deploys from GitHub on push
- Framework: Next.js (auto-detected)
- Build: `next build`
- Output: Serverless functions + static pages

### Environment variables (set in Vercel dashboard):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_PASSWORD=<custom admin password>
MAINTENANCE_MODE=false    # optional emergency override
```

### Local development:
```bash
cp .env.example .env.local    # fill in Supabase creds
npm install
npm run dev                    # http://localhost:3000
```

---

## 20. Database Schema

Supabase PostgreSQL — `supabase/schema.sql`:

### `submissions` table:
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | auto-generated |
| created_at | timestamptz | auto now() |
| name | text | validated |
| category | text | UR/OBC/SC/ST/EWS/PwBD |
| scores | jsonb | `{ "101": 216.07, ... }` |
| subjects_taken | text[] | `["101", "305", ...]` |
| dream_program_id | integer | nullable |
| dream_label | text | nullable |
| composite_top | numeric | highest composite among eligible programs |
| dream_probability | numeric | probability for dream program |
| user_agent | text | from request header |
| ip_hash | text | SHA-256 of IP, first 24 chars |

### `settings` table:
| Column | Type | Notes |
|--------|------|-------|
| key | text (PK) | e.g. "maintenance_mode" |
| value | jsonb | boolean/string |
| updated_at | timestamptz | |

### `outcomes` table (planned, not yet used):
For tracking actual admission outcomes against predictions (future feedback loop).

### RLS: Enabled on all tables. API uses service role key (bypasses RLS).

---

## 21. Known Design Decisions & Trade-offs

1. **Client-side results storage via sessionStorage**: Results don't survive tab close. This is intentional — no user accounts, no server-side sessions. Simple and privacy-friendly.

2. **Monolithic programs.data.json (573KB)**: All program data ships in the JS bundle. Fast at runtime (no API call needed), but increases initial load. Acceptable for this use case.

3. **Single 2025 data point for projection**: We only have one year of CUET-era cutoffs (2025). The projection is a modestly-informed estimate, not a precise forecast. Sigma captures this.

4. **No formula for performance-based programs**: Music, Fine Arts, Physical Education programs have 50% CUET + 50% practical test. DreamSeat only handles the CUET portion. These programs exist in the data but the practical component isn't modeled.

5. **PwBD cutoff estimation**: Most programs didn't publish PwBD cutoffs in Round 1 (seats went unfilled). We estimate using ST/SC cutoffs × 0.55 discount. This is rough but better than omitting entirely.

6. **B.A. Program shared seats**: All B.A. Program discipline combinations at a college share the same total B.A. seats. The engine passes the shared count to all variants.

---

## 22. CSS & Design System

`app/globals.css` — 669 lines of custom CSS on top of Tailwind.

### Design tokens:
- `--ink-900` to `--ink-100`: Slate scale
- `--brand`: Indigo (#4f46e5)
- `--safe/good/mid/risk/reach`: Probability verdict colors

### Key classes:
- `.card`: Glass-morphic card with backdrop blur
- `.card-solid`: Opaque white card
- `.field`: Form input with focus ring
- `.btn-primary`: Gradient indigo→violet button
- `.btn-ghost`: Outlined ghost button
- `.badge`: Pill badge with tone variants
- `.bar`: Probability/score bar with gradient fill
- `.ticker-*`: Scrolling marquee for cutoff showcase
- `.disclaimer-*`: Full editorial-style disclaimer layout
- `.logo-*`: Wordmark with sparkle animation
- `.dropdown-portal`: Portal-rendered dropdown for dream selector

### Fonts:
- **Inter**: Body text (weights 400-800)
- **Instrument Serif**: Display headings (`font-display` class)

### Responsive strategy:
- Mobile-first
- Key breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- KPI grid: 2 cols → 3 cols (md) → 5 cols (xl)
- Result cards: 4-col stats on desktop, 2×2 on mobile

---

## Quick Reference: API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/submit` | None | Run engine + save submission |
| GET | `/api/maintenance-status` | None | Check if maintenance is on |
| GET | `/api/admin/entries?password=...` | Password | Fetch all submissions |
| POST | `/api/admin/delete` | Password in body | Delete submissions |
| GET | `/api/admin/maintenance?password=...` | Password | Read maintenance state |
| POST | `/api/admin/maintenance` | Password in body | Toggle maintenance |

---

*This document was last updated on 2026-06-26. It reflects the complete state of the DreamSeat codebase including all formula fixes, 2026 data updates, search relevance improvements, seat data integration, and dev bypass.*
