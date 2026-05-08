Short summary
This repository is a Next.js (app-router) single-page app that runs primarily in the browser. It uses client components, TailwindCSS for styling, IndexedDB for local persistence, and includes helper libraries under `src/lib/` for AI prompt construction and local data management. The UI and most state live client-side; server code is minimal/nonexistent in the tree.

What I (an AI coding assistant) should know to be immediately useful
- Project type and entry points
  - Next.js app-router project. Root layout: `src/app/layout.tsx`. Main pages live under `src/app/` (e.g. `page.tsx`, `course/page.tsx`, `profile/page.tsx`).
  - Many components are "use client" React components. Prefer client-side edits to UI components and follow the project pattern of small, focused components in `src/components/`.

- Local persistence
  - IndexedDB wrapper lives at `src/lib/db.ts`. Read and follow its APIs: `get(store, key)`, `save(store, value, key)`, `getAll(store)`, `updateUser(updates)`.
  - Typical usage: `import { save, get } from '@/lib/db'` and call from client components. Keys often use "main" or stringified ids.

- AI / ML integration patterns
  - `@mlc-ai/web-llm` is a dependency (client-side LLM runtime). Look at `src/lib/webllm.ts` and `src/lib/aiPrompt.ts` for how prompts are constructed (notable: `buildCoursePrompt` and cognitive profiles).
  - Prompts are returned as strings and expected to produce strict JSON in some flows (e.g., course generation). Respect the "Output ONLY valid JSON" rule enforced in prompt builders.

- Styling and UI
  - Tailwind is used project-wide. Global styles: `src/app/styles/globals.css` and `tailwind.config.js` at repo root.
  - Components frequently use className utility strings; prefer keeping markup simple and accessible.

- Key developer workflows (how to run and build)
  - Local dev: `npm run dev` (Next dev server) — this is the main iteration loop.
  - Build: `npm run build` then `npm run start` for production.
  - Lint: `npm run lint`. Vercel special script: `npm run vercel-build` runs `next build --no-lint`.
  - There are no automated test scripts in package.json; add tests in `vitest` if adding automated checks (project already contains `vitest.config.ts` and `vitest.setup.ts`).

- Common code patterns and idioms
  - "use client" at top of components that access hooks or browser APIs — preserve this.
  - Small focused components in `src/components/` that accept props and emit callbacks (see `CodeEditor.tsx` pattern: controlled component with `onChange` and `initialValue`).
  - IndexedDB helper returns promises and often uses `main` as the default key. Use `updateUser` in `src/lib/db.ts` to patch user state safely.
  - Prompt building helpers (e.g. `getCognitiveInstruction`) encode domain rules — avoid changing prompt language unless intentionally updating course-generation behavior.

Concrete examples to follow when changing code
- Adding a new client page
  - Add file `src/app/<route>/page.tsx` or nested folders. If the page uses hooks/useEffect/local storage, add `"use client"` and import APIs from `@/lib/*`.

- Using the DB helper
  - To save a user record: `await save('user', { id: 'main', lock: 'abc' })` or to update: `await updateUser({ points: 100 })`.

- Building an AI prompt
  - Use `buildCoursePrompt(config)` from `src/lib/aiPrompt.ts`. Keep the final output restrictions (JSON only) in mind; if you need to change output shape, update all callers that parse the model output.

Project-specific conventions (don't assume defaults)
- Client-first architecture: most state and logic run in the browser (IndexedDB + client components). There is little server-side logic in this repo.
- Local IDs: Many stores use the key "main" as the primary record. Some stores (like `errors`) are autoIncrement. Use `getAll` for lists.
- Prompt strictness: prompt builders instruct models to output strict JSON — callers expect parsable JSON. If you relax the prompt, update parsing error handling.

Integration & external dependencies to be careful with
- `@mlc-ai/web-llm` runs in-browser and may require additional build/runtime handling on target platforms. Test locally with `npm run dev`.
- `idb` and IndexedDB behaviors vary across browsers — prefer using the wrapper in `src/lib/db.ts` rather than rolling your own.

Where to look first when debugging or making changes
- UI bug in a page: open `src/app/<route>/page.tsx` and its direct components in `src/components/`.
- State/persistence bug: inspect `src/lib/db.ts` and search for `save(` or `get(` usages.
- AI behavior: inspect `src/lib/aiPrompt.ts`, `src/lib/webllm.ts`, and any code that calls them (search for `buildCoursePrompt` or `web-llm` usage).

Small do/don't checklist for edits (short)
- Do: keep client/server separation clear; add `"use client"` to components using hooks.
- Do: use `@/lib/db` helpers for persistence and preserve the 'main' key pattern when appropriate.
- Do: preserve prompt wording if only small UI changes are required; changing prompt text has wide impact.
- Don't: convert client-only components to server components unless you also move or adapt browser APIs (IndexedDB, window).

If anything here is unclear or you want examples for another area (tests, CI, or adding new LLM prompts), tell me which area to expand and I'll update this file.
