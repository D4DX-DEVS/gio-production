# Project structure

One Next.js application (`apps/web`) holds the public website, the admin dashboard and all server code. On Cloudflare Workers, server code runs as route handlers and server actions, so there is no separate backend server. The database schema is a small shared package (`packages/db`).

## Folder tree

```
gio-production/
├── apps/
│   └── web/                     website, admin dashboard and backend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (site)/      public pages: home, news, events, gallery, documents, search, pages by slug
│       │   │   ├── admin/       admin dashboard: login, panel sections, upload and sign-in routes
│       │   │   ├── api/auth/    auth endpoint (sign-out only)
│       │   │   ├── media/       serves images and files from R2
│       │   │   ├── feed/        RSS feed
│       │   │   └── sitemap.ts, robots.ts, layout.tsx, globals.css, error.tsx, not-found.tsx
│       │   ├── components/      shared UI components (header, footer, carousel, lightbox, cards, ...)
│       │   ├── lib/             server logic: database access, content queries, auth, search, admin helpers
│       │   └── legacy/          old WordPress URL redirects and old image URLs
│       ├── public/_headers      response headers for static assets
│       ├── scripts/             TOTP secret generator; build helper for Windows
│       ├── worker.ts            Cloudflare Worker entry (old-URL layer first, then Next.js)
│       ├── wrangler.jsonc       Cloudflare config: D1 database, R2 buckets, Images binding
│       ├── open-next.config.ts  OpenNext config
│       ├── next.config.ts
│       └── .dev.vars.example    local secrets template
├── packages/
│   └── db/                      database schema and migrations
│       ├── src/schema/          tables (auth.ts, content.ts)
│       └── migrations/          SQL migrations applied to D1
├── package.json                 root commands
├── pnpm-workspace.yaml          workspace and install rules
├── pnpm-lock.yaml
├── .env.example                 names of every environment variable (no values)
├── README.md                    install, environment, run and deploy
└── PROJECT_STRUCTURE.md         this file
```

## How the admin saves

The admin menu is a vertical sidebar (`apps/web/src/app/admin/(panel)/layout.tsx` builds it, `shell.tsx` draws it). Every website section is its own card with its own Save button (`apps/web/src/lib/admin/section-form.tsx`). A save writes the draft rows and then calls `goLive` (`apps/web/src/lib/admin/live.ts`), which snapshots them into `published_layouts`, the only thing the public site reads. There is no separate Publish step; old snapshots are trimmed to the latest 20 per page.

## Where to find things

| Looking for | Location |
|---|---|
| Public pages | `apps/web/src/app/(site)/` (homepage: `page.tsx`) |
| Admin dashboard | `apps/web/src/app/admin/(panel)/`, one folder per section: `posts`, `pages`, `events`, `leaders`, `media`, `gallery`, `documents`, `menus`, `homepage`, `inbox`, `settings`, `users` |
| Admin login and security | `apps/web/src/app/admin/login/`, `apps/web/src/app/admin/sign-in/route.ts`, `apps/web/src/lib/auth.ts`, `apps/web/src/lib/admin/` (two-factor, rate limiting, access guard) |
| API routes | `apps/web/src/app/api/auth/`, `admin/sign-in/`, `admin/media-upload/`, `admin/media-options/`, `media/`, `feed/` |
| Server actions | `actions.ts` in each admin section; `apps/web/src/lib/contact-action.ts` (contact form) |
| Data access | `apps/web/src/lib/` (`content.ts`, `search.ts`, `youtube.ts`, `sanitize.ts`, `db.ts`) |
| Database schema and migrations | `packages/db/src/schema/`, `packages/db/migrations/` |
| Database configuration | `apps/web/wrangler.jsonc` (D1 binding `DB`), `apps/web/src/lib/db.ts` |
| Shared components | `apps/web/src/components/` |
| Styles | `apps/web/src/app/globals.css` |
| Images and media | R2 bucket binding `MEDIA`, served by `apps/web/src/app/media/` and `apps/web/src/legacy/media-handler.ts` |
| Old WordPress links | `apps/web/worker.ts`, `apps/web/src/legacy/` |
| Environment variables | `.env.example`, `apps/web/.dev.vars.example` |
| Tests | next to the code: `apps/web/src/**/*.test.ts` |
