# Corex Admin

Corex Admin is a Next.js dashboard for managing inventory, sales, and reports across multiple locales.

## Prerequisites

- Node.js 18 or newer
- npm 10+
- A Neon PostgreSQL database (free tier works for local development)

## Environment variables

Copy `.env.example` to `.env` and update the values to match your environment:

- `DATABASE_URL` – server-side connection string for your Neon database. Keep the writer endpoint credentials out of client bundles.
- `NEXT_PUBLIC_DEFAULT_LOCALE` – default locale used by the router and client components (`fa` or `en`). This is public by design because Next.js exposes `NEXT_PUBLIC_` prefixed values to the browser.

```bash
cp .env.example .env
# then edit .env
```

## First-time setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create (or fetch) your Neon connection string and paste it into `.env` as `DATABASE_URL`.
3. Optional: set `NEXT_PUBLIC_DEFAULT_LOCALE` to `en` if you prefer to start in English. It defaults to `fa`.
4. Apply database migrations:
   ```bash
   npm run db:migrate
   ```
5. Seed local reference data:
   ```bash
   npm run db:seed
   ```
6. Start the dev server:
   ```bash
   npm run dev
   ```

You should now be able to sign in at [http://localhost:3000](http://localhost:3000).

## Available npm scripts

- `npm run dev` – start the Next.js development server.
- `npm run build` – create a production build using Turbopack.
- `npm run start` – run the compiled production build.
- `npm run db:migrate` – apply Prisma migrations to the database listed in `DATABASE_URL`.
- `npm run db:seed` – execute `prisma/seed.ts` to load baseline inventory, products, and sales data.
- `npm run test` – execute the Vitest API and unit test suite.
- `npm run lint` – run ESLint with project rules (zero warnings allowed).
- `npm run format` – apply Prettier formatting across the repo.

## Working with locales

The app ships with Farsi (`/fa`) and English (`/en`) locales. Locale prefixes are always present in routes, for example:

- `http://localhost:3000/fa/items`
- `http://localhost:3000/en/reports`

Changing `NEXT_PUBLIC_DEFAULT_LOCALE` updates the locale used when a visitor lands on `/`.

## Currency conventions

All monetary values are stored and transmitted as integer Tomans. This keeps calculations simple (no floating-point rounding) while matching local reporting needs. Helpers such as `lib/money.ts` format these integers for display.

## Development workflow in under 5 minutes

1. Clone the repository.
2. Copy `.env.example`, paste your Neon connection string, and adjust the default locale if needed.
3. Run `npm install && npm run db:migrate && npm run db:seed`.
4. Start coding with `npm run dev`.

The API tests (`npm run test`) and linters (`npm run lint`) can be run at any time to validate your changes.
