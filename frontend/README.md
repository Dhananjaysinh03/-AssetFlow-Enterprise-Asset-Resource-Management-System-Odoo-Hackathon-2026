# AssetFlow — Frontend

React (Vite) frontend for the AssetFlow Enterprise Asset & Resource Management System.
Built to the API contract in the project's `AssetFlow_Build_Roadmap.md`.

## Setup

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. The dev server proxies `/api/*` to
`http://localhost:4000` (see `vite.config.js`) — start the backend on port
4000, or edit the proxy target if it runs elsewhere.

## What's included

- **Auth:** Login, Signup (employee-only), JWT stored in `sessionStorage`, `AuthContext` hydrates the session on refresh via `GET /api/auth/me`.
- **Organization Setup** *(Admin only)*: Departments, Asset Categories, Employee Directory with role promotion.
- **Asset Directory:** Register + search/filter by category, status, department.
- **Allocation & Transfer:** The core demo screen — allocating an already-held asset surfaces a `ConflictModal` with the current holder's name and a "Request Transfer" action, instead of a generic error.
- **Resource Booking:** The second core demo screen — booking an overlapping time slot is rejected with the conflicting booking shown; a back-to-back slot succeeds.
- **Dashboard:** Real KPI cards pulled from `GET /api/dashboard/kpis` (light polling, no mocked numbers).

## Design system

All tokens (colors, spacing, radius, shadows) live in `src/styles/theme.css` as CSS
variables — change the palette in one place. The signature visual element is
`<StatusBadge>`, a color-coded pill used identically for asset lifecycle status
and booking status across every screen.

## Expected backend responses

The frontend expects these shapes; adjust `src/api/client.js` if your backend differs:

- `POST /api/allocations` conflict → `409 { error, currentHolder, canTransfer: true, allocationId }`
- `POST /api/bookings` conflict → `409 { error, conflictingBooking: { startTime, endTime } }`
- List endpoints (`/assets`, `/departments`, `/employees`, `/allocations`, `/bookings`) return plain arrays.
- `/auth/login` and `/auth/signup` return `{ token, user }`.

## Notes on choices made for a 5-hour build

- No component library (no MUI/Chakra) — hand-rolled CSS to avoid dependency/version risk on a tight clock and to keep the bundle small and offline-reliable.
- No icon library — a handful of inline SVGs in `components/icons.jsx`.
- No form validation library — small hand-written validators in `utils/validators.js`, sufficient for this scope.
- Plain JSX, not TypeScript — removes build-config overhead; swap in `.tsx` later if there's time to spare.
