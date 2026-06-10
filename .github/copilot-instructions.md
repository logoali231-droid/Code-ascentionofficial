## Short summary
Next.js (app-router) PWA focused on client-side UX. Most app logic runs in the browser: UI components, IndexedDB persistence, in-browser LLMs, and web workers. Server code is minimal (API endpoints under `src/app/api/` and an optional `runtime-server/` Dockerized runtime).

## Big picture (what matters)
- App router root: `src/app/layout.tsx` — renders `ClientBody`, `Web3Provider` and client-only components (SpeedInsights, Analytics).
- Client-first: Components that use hooks or browser APIs must be client components (`"use client"`). Prefer editing `src/components/` and `src/app/**` client pages.
- Local persistence: single IndexedDB wrapper at `src/lib/others/db.ts`. Use exported APIs: `save(store, value, key)`, `get(store, key)`, `getAll(store)`, `updateUser(updates)`. Many stores use the key `main`.
- AI integrations: prompt builders live at `src/lib/others/aiPrompt.ts` (see `getCognitiveInstruction`, `buildCoursePrompt`). Worker usage: `src/lib/workers/*.worker.ts` calls the same builders. Models run in-browser via `@mlc-ai/web-llm` (dependency in `package.json`).

## Critical workflows & commands
- Dev server (binds to all interfaces and uses port 3001): `npm run dev` (command in `package.json`).
- Build for production: `npm run build` then `npm run start` (or `npm run vercel-build` for Vercel CI which runs `next build --no-lint`).
- Lint & typecheck: `npm run lint`, `npm run type-check`.
- Tests: repo includes `vitest.config.ts` and `vitest.setup.ts` — add vitest tests if needed; there are no preconfigured test scripts in `package.json`.

## Project-specific patterns & gotchas (exact, not generic)
- IndexedDB wrapper behavior (see `src/lib/others/db.ts`): local in-memory write buffer + batched flush, SAVE_DEBOUNCE_MS and cloud sync via `/api/cloud/sync` and `BroadcastChannel`. This means:
  - `save()` is debounced and may not write immediately to disk — reads use the write buffer for consistency.
  - Many callers save using `await save('user', user, 'main')` and expect `updateUser()` to return merged user.
- Prompt strictness: `buildCoursePrompt()` constructs instructions that demand strictly-parsable JSON/Markdown payloads. Callers (pages and workers) parse model output directly — do not alter the format without updating all consumers.
- Web workers: content generation and heavy tasks are delegated to workers under `src/lib/workers/` (e.g., `course.worker.ts`, `shop.worker.ts`). Check workers when changing compute-heavy logic.
- Use of `use client`: pages under `src/app/` may be server components by default — add the directive only when client-only APIs (hooks/window/indexedDB) are used.

## Where to look (concrete file references)
- Root layout: `src/app/layout.tsx` (Web3Provider, ClientBody, dev toggles).
- IndexedDB + sync: `src/lib/others/db.ts` (save/get/updateUser + debounced batch flush and cloud sync).
- Prompt builders: `src/lib/others/aiPrompt.ts` (see `getCognitiveInstruction`, `buildCoursePrompt`).
- Workers: `src/lib/workers/*.worker.ts` (they call `buildCoursePrompt`).
- Components: `src/components/` — small focused client components (example: `CodeEditor.tsx`).
- Public PWA assets: `public/manifest.json`, `public/sw.js` (service worker).

## Integration & external dependencies to be careful with
- `@mlc-ai/web-llm` (in-browser LLM) — may need platform-specific handling and large bundles.
- `dexie` and `idb` for IndexedDB — the wrapper in `src/lib/others/db.ts` provides buffering and schemas; use it.
- Wallet/Web3: `src/providers/web3Provider.tsx` is used in layout. Editing web3 flows can affect many pages.

## Quick coding checklist (concrete rules)
- If you touch a UI file that uses hooks or `window` add `"use client"` at top.
- When editing prompt text in `aiPrompt.ts`, update every consumer (pages and workers) that parse the model output.
- Prefer using `save/get/updateUser` from the DB wrapper instead of direct `dexie` calls.
- When adding routes: put `page.tsx` under `src/app/<route>/`. If the page must be client, include `"use client"`.

## Example snippets (how things are used in repo)
- Save user: `await save('user', updatedUser, 'main')` (see `src/app/profile/page.tsx`).
- Build course prompt: `await buildCoursePrompt({ topic, learningState, courseId, profile })` (see `src/app/new/page.tsx` and `src/lib/workers/course.worker.ts`).

## When you can't proceed
- If you need to change schemas or core DB behavior, run the app and validate multi-tab sync and cloud sync endpoints (`/api/cloud/sync`).
- For heavy LLM experiments, test in dev mode (`npm run dev`) with browser tools; large model ops may block the UI — prefer running in a worker.

If any section is unclear or you want something added (examples, templates, or a short checklist for PR reviewers), tell me which part to expand.
