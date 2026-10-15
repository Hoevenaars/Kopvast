<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- The dev server is `npm run dev` and listens on port **43127** (`http://127.0.0.1:43127`). The homepage hostname default is `0.0.0.0`.
- Public pages and the contact form at `/contact` work without Supabase, Resend, or other secrets. A submitted question is stored in `/tmp/kopvast-leads.json`. Copy `.env.example` to `.env.local` only when testing email or the admin and customer consoles.
- Checks already used by this repo: `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. `npm run lint` currently fails on a pre-existing `react-hooks/set-state-in-effect` error in `src/components/scout/capture-form.tsx`.
