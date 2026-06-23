# CUET 2026 → DU Admission Predictor

A production-ready, mathematically explainable admission probability calculator for
**all 1,526 Delhi University college-program combinations** based on **real CUET 2025 + 2026
NTA data** and the **DU 2025-26 Round-1 cutoffs**.

Built with **Next.js 14 (App Router)**, **Tailwind CSS**, **Supabase (PostgreSQL)** and deployable
in one click to **Vercel + GitHub**.

---

## ✨ Features

| | |
|---|---|
| 🎯 | Per-program composite computed with the **correct DU CUET formula** (BFIA, BMS, BBE, BCom Hons, B.Sc PCM, B.Sc Bio, B.A. Hons, B.A. Programs, B.Voc, B.El.Ed, B.Tech) |
| 📊 | Projected 2026 cutoff with **Conservative / Most-Likely / Aggressive** bands |
| 🧮 | **12-factor** explainable engine — pool growth, category competition, top-end density, subject-normalisation shifts, structural rule changes, historical drift, etc. |
| 🟢🟡🔴 | Admission probability + 6-tier verdict (Extremely Likely → Reach) |
| 🎲 | **What-if simulator** — "If I scored 10 marks more, what changes?" |
| 📈 | Prediction-confidence score (lowered when structural rules changed) |
| 🛂 | Subjects-taken checklist auto-filters eligible programs |
| 💾 | Every submission persisted to Supabase (name, scores, category, dream program, etc.) |
| 🔐 | Password-protected admin dashboard with CSV export |
| 📱 | Fully mobile responsive |

---

## 🚀 Quick start (local)

```bash
git clone <your-repo>
cd cuet-predictor
npm install

cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 1) In Supabase: paste contents of supabase/schema.sql into the SQL editor and run.
# 2) Start dev server:
npm run dev
```

Visit http://localhost:3000

---

## 🔐 Required environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
ADMIN_PASSWORD=CUET_ADMIN@#$118
```

- **NEXT_PUBLIC_SUPABASE_URL / ANON_KEY** — used client-side and by `/api/submit`
- **SUPABASE_SERVICE_ROLE_KEY** — used **server-side only** by `/api/admin/entries`
- **ADMIN_PASSWORD** — gates the admin dashboard

---

## ☁️ Deploy to Vercel

1. Push this repo to GitHub.
2. Go to https://vercel.com → **New Project** → import the repo.
3. Add the four environment variables above in **Project Settings → Environment Variables**.
4. Click **Deploy**.

Done. The app is live at `https://your-app.vercel.app` and the admin at `/admin`.

---

## 🧠 How the math works

### Composite-score engine (`lib/composite.js`)
Each program has a **formula tag** (`BFIA`, `BCOM_HONS`, `BSC_PCM`, etc.) that knows the
exact DU CUET 2026 subject combination required. Given a student's per-subject scores,
the engine returns:

- `composite` — sum of the relevant 4 subject scores (out of 1000)
- `outOf` — the denominator (always 1000 for 4-subject formulas)
- `breakdown` — which subjects were used and in what role

Examples:

| Program | Formula |
|---|---|
| SSCBS BBA (FIA) | 1 Language + Mathematics + 1 Domain + GAT |
| B.Com (Hons.) | 1 Language + 3 best of {Acc, BSt, Eco, Math} |
| B.Sc (Hons.) Physics | 1 Language + Physics + Chemistry + Mathematics |
| B.A. (Hons.) Economics | 1 Language + Mathematics + 2 best Domain |
| B.A. (Hons.) English | English + 3 best Domain |
| B.A. Programs | Best of {1L+3D, 2L+2D, 1L+1D+GAT} |

### Projected cutoff engine (`lib/predict.js`)
For each program, we transform the 2025 DU cutoff to a 2026 projection using:

```
mostLikely_2026 = cutoff_2025 × SubjectShift × StructuralScale + AdditiveDrift
```

Factors that go in:

| ID | Factor | Source |
|---|---|---|
| F1 | Candidate pool growth (10.71L → 11.64L appeared) | NTA 2026 PR |
| F3 | Category competition growth (UR/OBC/SC/ST/EWS/PwBD) | NTA 2026 PR |
| F4 | Subject max-score shifts (Eng, Math, Eco, Phy, Chem, GAT…) | NTA PRs |
| F5 | Top-end density growth (100%-ile holders ↑20%) | NTA PRs |
| F6 | Subject-difficulty normalisation | F4 multiplicative |
| F7 | Historical CUET-era cutoff drift (~+1.5 marks/yr) | DU 2024/2025 |
| F8 | Structural rule changes (e.g. **BFIA +1 domain in 2026**) | DU 2026 bulletin |

The output is a band:

```
conservative = mostLikely − σ
aggressive   = mostLikely + σ          where σ = max(8, mostLikely × 2.5%)
```

### Admission probability
A logistic curve:

```
P(admit) = sigmoid((yourScore − mostLikely) / σ × seatFactor × 1.6)
clipped to [2%, 98%]
```

Where `seatFactor` widens/tightens the curve based on category-seat scarcity.

### Verdict bands
| % | Label | Color |
|---|---|---|
| ≥ 95 | Extremely Likely | 🟢 |
| 80–94 | Very Strong | 🟢 |
| 60–79 | Strong Chance | 🔵 |
| 40–59 | Competitive | 🟡 |
| 20–39 | Difficult | 🟠 |
| < 20 | Reach | 🔴 |

### Prediction confidence
Reported per-card (45–95%). Lower when:
- The program had structural rule changes (e.g. BFIA 3→4 subjects)
- The 2025 cutoff itself was very low (sparse data)
- 2026 subject-max data is not yet available for the dominant subjects in the formula

---

## 🗂️ Data sources (all bundled in `lib/programs.data.json`)

- **DU 2025-26 First Round Allocation cutoffs** — 1,526 program-category rows
- **DU Seat Matrix (Entrance-Based courses)** — exact seat counts for SSCBS / BBE / BMS / B.El.Ed etc.
- **NTA CUET 2025 Press Release** — pool, category, subject statistics
- **NTA CUET 2026 Press Release** — same, for 2026
- **DU compulsorysubjects.pdf** — programme-subject mapping used to derive formulas

---

## 🛠️ Project structure

```
cuet-predictor/
├── app/
│   ├── layout.js              ← global shell + nav
│   ├── globals.css            ← Tailwind + tokens
│   ├── page.js                ← Step-by-step entry form
│   ├── results/page.js        ← Ranked results page (with dream-card)
│   ├── admin/page.js          ← Password-gated dashboard
│   └── api/
│       ├── submit/route.js          ← POST: saves to Supabase + runs engine
│       └── admin/entries/route.js   ← GET (password): all submissions
├── lib/
│   ├── subjects.js            ← CUET subject taxonomy
│   ├── cuet2026.js            ← 2025+2026 NTA global stats
│   ├── composite.js           ← per-program merit composer
│   ├── predict.js             ← projected-cutoff & probability engine
│   ├── engine.js              ← runs the whole pipeline
│   ├── programs.data.json     ← 1,526 cutoff rows + formulas + seats
│   ├── supabase.js            ← Supabase client factories
│   └── subjects.data.json
├── supabase/schema.sql        ← run this once in your Supabase project
├── data/                       ← raw parsed JSON (reference only)
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
├── package.json
└── .env.example
```

---

## 📅 Roadmap (post-launch hooks already wired)

- ✅ `outcomes` table — capture **actual CSAS allocations** from users → train next year's model
- 🔜 Trend learning: when ≥200 outcomes exist, blend model output with empirical Bayes update
- 🔜 Public colleges-explorer page (no entry needed)
- 🔜 Round-wise drift modelling (R1 vs R2 vs R3 vs Spot)

---

## ⚠️ Disclaimer

This tool produces **statistical projections** built from publicly-released CUET and DU data.
It is **not** affiliated with NTA or the University of Delhi. Actual cutoffs depend on
applicant behaviour, preference filling, withdrawals, and DU/CSAS policy. Use as a guide,
not as a guarantee.
