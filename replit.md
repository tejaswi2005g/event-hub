# EventHub — Event Management System

A full-stack Event Management System with three user roles (Admin, Organizer, Participant), JWT authentication, event discovery, registration, QR tickets, and analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/event-management run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT (jsonwebtoken) + bcryptjs
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind CSS + React Query
- QR codes: qrcode package

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Database schema (users.ts, events.ts, registrations.ts)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `artifacts/event-management/src/` — React frontend

## Architecture decisions

- JWT stored in localStorage under `ems_token` key; user object under `ems_user`
- Three roles: admin, organizer, participant (enforced in middleware + routes)
- Events require admin approval before appearing publicly (`approvalStatus: pending | approved | rejected`)
- QR codes generated server-side on registration using `qrcode` library as base64 data URLs
- Organizer stats only expose their own events; admin sees all

## Product

- **Participants**: browse/search events by category/date, register, view QR tickets, cancel registrations, get personalized recommendations
- **Organizers**: create/edit/delete events, view attendee lists with CSV export, see registration analytics with charts
- **Admins**: approve/reject events, manage all users (roles, active status), system-wide dashboard stats

## Seed accounts

| Email | Password | Role |
|-------|----------|------|
| admin@eventms.com | admin123 | Admin |
| sarah@eventms.com | organizer123 | Organizer |
| mike@eventms.com | organizer123 | Organizer |
| alice@eventms.com | participant123 | Participant |
| bob@eventms.com | participant123 | Participant |

## User preferences

_Populate as you build._

## Gotchas

- Run `pnpm run typecheck:libs` after any schema changes before typechecking artifacts
- OpenAPI body schemas must use entity-shaped names (NoteInput, not CreateNoteBody) to avoid TS2308 collision
- Endpoints with both path params AND query params can cause Orval naming collisions; remove query params or rename operationId
- `req.params.id` in Express 5 is `string | string[]` — cast with `as string`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
