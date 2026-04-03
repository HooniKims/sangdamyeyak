# Repository Guidelines

## Project Structure & Module Organization
`app/` contains Next.js App Router pages, layouts, and API routes such as `app/api/auth/check-lock/route.ts`. Put reusable UI in `components/`, shared Firebase, reservation, school, and i18n logic in `lib/`, and cross-cutting TypeScript types in `types/`. Static assets, icons, the web manifest, and service workers live in `public/`. Firestore access policy is defined at the repo root in `firestore.rules` and `firestore.indexes.json`. `cafe-article/` is local-only content and is intentionally gitignored.

## Build, Test, and Development Commands
`npm install` installs dependencies.
`npm run dev` starts the local Next.js dev server.
`npm run build` creates a production build and catches route or env regressions.
`npm run start` serves the built app locally.
`npm run lint` runs ESLint with the Next.js Core Web Vitals and TypeScript presets.

There is no committed `npm test` script yet, so linting, building, and manual smoke testing are the current baseline.

## Coding Style & Naming Conventions
Use TypeScript and React function components. Follow the existing style: 2-space indentation, single quotes, and semicolons. Name reusable components in PascalCase, for example `PublicBookingPage.tsx`; keep helper modules in camelCase or kebab-case, for example `reservation-firebase.ts`; and keep route folders lowercase, for example `app/check-reservation`. Prefer `@/` imports over deep relative paths. Keep Tailwind utility classes close to the component unless the pattern is reused.

## Testing Guidelines
Before opening a PR, run `npm run lint` and `npm run build`. Then manually verify the flows touched by your change, especially login/logout, teacher and parent booking, reservation lookup, and admin-only actions. If you add an automated test setup, place tests next to the source as `*.test.ts` or `*.test.tsx` and add the command to `package.json`.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commits with concise Korean summaries, for example `feat: ...`, `fix: ...`, `docs: ...`, and `chore: ...`. Keep each commit focused on one change. PRs should include the purpose, affected routes or components, any required `.env.local` or Firestore rule/index updates, and screenshots for UI changes.

## Security & Configuration Tips
Copy `.env.local.example` to `.env.local` and never commit secrets. Changes that touch auth, Firestore queries, or booking data should be reviewed against both the client code and `firestore.rules`. If you modify PWA behavior, verify both `public/sw-v2.js` and the headers in `next.config.ts`.
