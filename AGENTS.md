# AGENTS.md

## Project context
- This is a Next.js 16 application in the workspace root.
- Main folders: app/ for routes, components/ for UI, lib/ for helpers and data logic.
- Use the existing structure and naming patterns when making changes.

## Commands
- Start dev server: npm run dev
- Build app: npm run build
- Run lint: npm run lint

## Guidance for coding agents
- Prefer editing existing components over creating duplicate implementations.
- Keep changes small and focused.
- Follow the styling and architecture already used in the surrounding code.
- Preserve app behavior unless the task explicitly requires a change.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
