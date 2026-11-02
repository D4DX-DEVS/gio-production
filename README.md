# GIO Kerala website

Production code for [giokerala.org](https://www.giokerala.org) (Girls Islamic Organization Kerala): the public website, the admin dashboard and the backend, as one Next.js application on Cloudflare Workers.

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for where each part lives.

## Technology

| Layer | Technology |
|---|---|
| Website and backend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Hosting | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`), Wrangler 4 |
| Database | Cloudflare D1 (SQLite) with Drizzle ORM |
| Media storage | Cloudflare R2 |
| Admin login | Better Auth, one admin account set by environment variables, TOTP two-factor, login rate limiting |
| Package manager | pnpm 10 workspace, Node.js 22 |

## Requirements

- Node.js 22 (22.12 or newer, below 23)
- pnpm 10.34.7: run `corepack enable pnpm` once
- A Cloudflare account with Workers, D1 and R2

## Install

```bash
git clone https://github.com/D4DX-DEVS/gio-production.git
cd gio-production
corepack enable pnpm
pnpm install
```

## Environment

Secrets are never committed.

- **Local:** copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars` and fill it in.
- **Production:** set each secret with `wrangler secret put <NAME>` (run inside `apps/web`). Never put secrets in `wrangler.jsonc`.

| Variable | Purpose |
|---|---|
| `BETTER_AUTH_SECRET` | random secret for sessions, for example from `npx @better-auth/cli secret` |
| `BETTER_AUTH_URL` | the site's public URL, for example `https://www.giokerala.org` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | the only admin login (password at least 12 characters) |
| `ADMIN_NAME` | name shown in the admin sidebar (optional) |
| `ADMIN_TOTP_SECRET` | two-factor secret from `node apps/web/scripts/generate-totp-secret.mjs`. **Required in production**: without it nobody can sign in |

All variable names, including ones for later (Turnstile, email, Cloudflare Access), are listed in [.env.example](.env.example).

## Run locally

```bash
pnpm db:migrate:local   # create the local database tables
pnpm dev                # http://localhost:3000 and http://localhost:3000/admin/
pnpm preview            # production build in the Workers runtime, http://localhost:8787
```

A new local database is empty. Content is added through the admin dashboard, or copied from an existing database (see "Content" below).

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Deploy to Cloudflare

`apps/web/wrangler.jsonc` is currently a local configuration: the D1 `database_id` is a placeholder and the bucket names end in `-local`. Before the first deployment:

1. Create the D1 database and the R2 buckets (`MEDIA`, `PRIVATE`, and the OpenNext cache bucket), then put their real IDs and names in `apps/web/wrangler.jsonc`.
2. Set the secrets listed above with `wrangler secret put`.
3. Apply the database migrations: `pnpm --filter web exec wrangler d1 migrations apply DB --remote`.
4. Build and deploy:

   ```bash
   pnpm build:cf
   pnpm --filter web exec opennextjs-cloudflare deploy
   ```

## Content

Site content (posts, pages, leaders, menus, homepage) lives in the D1 database. Images and files live in the R2 `MEDIA` bucket. Neither is in Git.

To move existing content into production, export the source database (`wrangler d1 export DB --local --output content.sql`), run it against the production database (`wrangler d1 execute DB --remote --file content.sql`), and upload the media files to the production R2 bucket with the same object keys. Treat the export as private data: it contains contact-form messages and account records.

## Old WordPress links

`apps/web/worker.ts` and `apps/web/src/legacy/` keep old giokerala.org URLs and `/wp-content/uploads/` image links working. Their data is generated into `apps/web/src/legacy/generated/` and committed. The generator and the migration tooling live in the development repository, not here.
