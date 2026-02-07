# SenseKit

Interactive research tools to understand how people think.

SenseKit is a suite of web-based tools for qualitative and quantitative research. Researchers create projects, share a link with participants, and collect structured data in real time — with built-in visual analytics.

**[sensekit.eu](https://sensekit.eu)**

---

## Tools

### StakeMap
Collaborative stakeholder mapping on a customizable 2D matrix. Participants drag-and-drop stakeholders on bipolar axes (e.g. Influence / Interest), and the dashboard aggregates positions with dispersion ellipses.

**[stakemap.sensekit.eu](https://stakemap.sensekit.eu)**

### SemDiff
Digital semantic differential. Collect ratings on custom bipolar scales (e.g. Innovative — Traditional) and visualize mean profiles with standard deviation indicators across participants.

**[semdiff.sensekit.eu](https://semdiff.sensekit.eu)**

### CompScape
Visual competitive analysis. Participants position competitors on a 2D matrix, and the dashboard shows aggregated perceptions with dispersion ellipses to identify consensus and ambiguity.

**[compscape.sensekit.eu](https://compscape.sensekit.eu)**

---

## How it works

1. **Create a project** — Define axes, scales, or competitors from the admin dashboard
2. **Share the link** — Each project generates a unique session link. Participants respond from their browser, no login required
3. **Analyze results** — View aggregated data in real time with charts, tables, and CSV export

---

## Tech stack

| Layer | Tech |
|-------|------|
| Monorepo | pnpm workspaces |
| Apps | Vite + React 18 + TypeScript |
| Marketing site | Next.js 15 (SSG) |
| UI library | Radix UI + CVA + Tailwind CSS (shadcn/ui pattern) |
| Auth | Firebase (email/password for admins, anonymous for participants) |
| Database | Firebase Realtime Database |
| Deploy | Vercel |

## Project structure

```
apps/
  stake-mapping/        StakeMap app
  semantic-differential/  SemDiff app
  comp-scape/           CompScape app
  website/              Marketing site (sensekit.eu)
packages/
  shared-ui/            Shared component library
```

## Development

```bash
# Install dependencies
pnpm install

# Run individual apps
pnpm dev:stake        # localhost:5173
pnpm dev:semdiff      # localhost:5174
pnpm dev:compscape    # localhost:5175
pnpm dev:website      # localhost:3001

# Build
pnpm build:all        # Build everything
```

## Environment variables

Each app requires a `.env` file with Firebase credentials. See `.env.example` in each app directory.

## License

All rights reserved.
