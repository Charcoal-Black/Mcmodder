**This file MUST be written and edited in English.**

## Commands

```bash
npm run dev      # vite-plugin-monkey dev server; install the served script into Tampermonkey to get HMR
npm run build    # vue-tsc (type check) && vite build  ->  dist/mcmodder.user.js
npm run lint     # eslint src
npm run format   # prettier --write src
```

- `npm run build` is the only gate. `vue-tsc` runs first, so type errors and unused locals/parameters fail the build (`strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`).
- No test suite exists (`playwright` is not wired to anything). Validate with build + lint, then exercise runtime behavior in a browser on mcmod.cn.
- The shippable artifact is `dist/mcmodder.user.js`, installed by copy-pasting into Tampermonkey.

## Working rules

- **Reuse the existing mechanism.** Every feature area has an established entry point (see "Where to change what"); do not introduce a second convention for the same job.
- **`CHANGELOG.md` is user-owned.** Never edit it unless explicitly instructed; do not add entries for your own work on your own initiative.
- Comments, config titles/descriptions, and UI copy are Chinese in the existing house style. Keep it that way.
- `eslint.config.ts` exemptions are closed lists: legacy files (`src/main.ts`, `src/widget/Splash3D.ts`) and host integrations that cannot avoid `any` (UEditor, ECharts, request queues, `ConfigRepository`, ...). Do not refactor legacy code on sight, and never add new files to these lists to silence your own code.
- `import type` is mandatory for type-only imports (`verbatimModuleSyntax`). Delete unused locals/parameters instead of keeping them; the build fails on them.

## Host-page constraints

- The script runs at `document-start` inside mcmod.cn pages. Host globals (`$`/jQuery, `editor`, `swal`, `PublicLangData`, `echarts`, `structure_browser`, ...) are declared in `src/Mcmod.d.ts` but only exist on real pages: touch them only inside `Init.run()` or event callbacks, never at module scope. Nothing in `src/` is runnable under plain Node.
- GM APIs go through the `$` alias (`import { GM_getValue } from "$"`, i.e. `vite-plugin-monkey/client`). Never use `localStorage`/`sessionStorage` for app data.
- All network traffic goes through `Utils.createRequest` (spacing via `minimumRequestInterval`, logging to `mcmodderLogger`, automatic `yxd_token` cookie retry). Never call `GM_xmlhttpRequest` directly.
- External libraries are not bundled:
  - CDN libraries from `vite.config.ts` (`require:` + `externalGlobals`): `codemirror`, `turndown`, `js-beautify`, `@supabase/supabase-js`, `three`, `opentype.js`. Consume them as the mapped globals (e.g. `window.THREE`) and rely on their npm `@types` packages for type-checking. The CDN `three` is used only by `Splash3D`.
  - mcmod.cn's own libraries: jQuery, SweetAlert (`swal`), Bootstrap, UEditor (`editor`), ECharts (`echarts`), `structure_browser`, and the site's Three.js — use page globals or lazy-load via `Utils.loadScript(..., Values.assets.mcmod.js.*)` as `StructureEditor.vue` does.
  - Do not upgrade the intentionally old pins (jQuery, SweetAlert) or swap host libraries for npm packages; compatibility with the legacy site is the reason for both.

## Where to change what

- **Page-specific feature** -> new `Init` subclass in `src/init/` (`canRun()` = URL/DOM gate, `run()` = DOM work), registered in `src/loader/InitLoader.ts`. Never put page logic in `src/main.ts`.
- **SPA-like pages** (center, admin) -> sub-inits in `src/init/center/` / `src/init/admin/` dispatched by `MutationObserver`, following `CenterInit`/`AdminInit`. `AdminBaseInit` subclasses are matched by their `h1.title` and called on every navigation to that page: put repeatable rendering in `run()`, and one-time side effects (`window`/`document` listeners, timers) in `firstRun()`.
- **Editor behavior** -> `GeneralEditInit.canRun()` always returns `false`; `Mcmodder.editorLoad()` instantiates it directly when an editor exists. Host UEditor wrappers live in `src/ueditor/`.
- **New setting** -> add the key to `Settings` (`src/types/types.d.ts`), register it with an `add*Config` call in `src/loader/ConfigLoader.ts` (id, title, description, default, optional `Permission`), and reuse the matching control in `src/vue/components/input/`.
- **Persisted state** -> `ConfigRepository` (`getSettings`/`setSettings`, reactive `getSettingsRef`/`get*WritableRef`, number-list variants, `*Profile` per uid, `*Class` per classID). Prefer it over raw `GM_*Value` calls for keys it covers.
- **Reactive/storage-cached keys** -> register with `StorageBuffer.addCacheableItem` in `src/loader/StorageBufferLoader.ts`; global config-to-behavior watchers (night mode, page width) live in `Mcmodder.watchRef()`.
- **Batch, pausable network work** -> `src/requestqueue/*`; **scheduled tasks** (auto check-in, update check, pre-edit polling) -> `src/schedulerequest/*`.
- **Short-comment custom reactions** (自定义表态: built-in `devil-angry` + arbitrary emoji) -> `src/attitude/`: `AttitudeSystem` is the page-wide singleton (row injection, batched count cache, unread stats, writes), `AttitudePickerState` + `src/vue/components/attitude/AttitudePicker.vue` render the emoji picker panel. `devil-angry` is not an emoji: it is appended to the site's native attitude list (`.comment-attitude-list-hover`) and its result item stays in `.comment-attitude-result`. Page hooks: `src/init/CommentInit.ts` (short-comment rows), `src/init/MessagePageInit.ts` (sub-tab badge + total row on every message-center page, inbox list, per-message counts), `src/init/center/CenterCommentInit.ts` (stats panel), `Mcmodder.main()` (unread merged into the header bell / tab title via `notifyUnreadMessage`). Cloud side lives in `supabase/`; the `mcmodder_attitudes` table is service-role only (RLS enabled, no policies, `anon` revoked) — never read/write it with `supabase.from(...)` from the client, go through the `attitude-*` Edge Functions.
- **Notification that must appear in a visible tab exactly once** (currently the auto-verify reminder) -> `src/modal/*`. Add a `ModalType` subclass under `src/modal/types/`, register it in `ModalTypeTypes` (`src/types/types.d.ts`), and trigger it with `Mcmodder.modalBroadcaster.send("newVerification", payload)`. Payload must be plain JSON data: the class (and thus `preConfirm`/`interceptEvents` callbacks) is rebuilt in the receiving tab. `Utils.createModal` stays for modals bound to the current page's own interaction.
- **JSON import/export** -> pluggable `AppRepository<T>` backends in `src/jsonframe/repository/` (GM storage vs Dexie/IndexedDB, switched by the `itemRepository` setting); UI in `src/vue/components/jsonframe/`.
- **Vue components** -> not an SPA: mount ad hoc into host DOM nodes with `createApp(Component, { parent: mcmodder })`; components take a `parent: Mcmodder` prop. `src/vue/mount.ts` (`mountVueApp`, Shadow DOM isolation) exists but has no call sites yet. Read the vendored skills under `.agents/skills/` (`vue-best-practices`, `vue-debug-guides`, ...) before Vue work.
- **Plain-DOM widgets** -> `src/widget/*` (`MainText`, draggable/compare frames, logger, `Splash3D`, `Swiper`, `toast/RequestToastBroadcaster` for the cross-tab request toasts). **Editable tables** -> `src/table/*`, command/undo pattern (`Command` + `src/table/command/`). **GTCEu integration** -> `src/integration/`.
- **Global CSS** -> `src/css/*.css`, collected by `src/loader/StyleLoader.ts` into the `--mcmodder-*` palette plus one injected `<style>`. Component CSS is auto-collected by the `cssSideEffects` hook into `<style data-mcmodder-vue-css>`.

## Key files

- `src/main.ts` — `document-start` bootstrap: anti-flash overlay, `bbs.mcmod.cn` night mode, waits for host jQuery, then constructs `Mcmodder`.
- `src/Mcmodder.ts` — composition root: builds services and loaders, runs `InitLoader`, then `main()` and `initList.filter(i => i.canRun()).forEach(i => i.run())`.
- `src/loader/*` — `ConfigLoader`, `StyleLoader`, `StorageBufferLoader`, `AdvancementLoader`, `ScheduleRequestLoader`, `MenuCommandLoader`, `InitLoader`.
- `src/config/` — `ConfigUtils` (option registration) and `ConfigRepository` (typed GM-storage facade).
- `src/StorageBuffer.ts` — GM key -> Vue `shallowRef` cache with cross-tab sync via `GM_addValueChangeListener`.
- `src/modal/` — cross-tab modal broadcast: `ModalType` base, `ModalBroadcaster` (single-slot GM Storage channel, `Values.MODAL_BROADCAST_EXPIRE` TTL), `types/NewVerificationModal`; receiver side is `ModalBroadcastInit` in `src/init/`.
- `src/widget/toast/RequestToastBroadcaster.ts` — cross-tab request toasts: every dispatched `Utils.createRequest` appends a `RequestToastRecord` to a GM Storage array and shows an iziToast on every visible tab (`Values.REQUEST_TOAST_*`); unlike `src/modal/` it does **not** claim or dedupe across tabs, only locally by record id. Receiver side is `RequestToastInit` in `src/init/`.
- `src/types/types.d.ts` — global types: `AppStorage`, `Settings`, `Profile`, `Class`, `Item`, `KeysOfType`, `IndexedType`, table types; `src/types/props.d.ts` / `emits.d.ts` hold component contracts.
- `supabase/` — **local-only (git-ignored)** cloud resources: `migrations/*` (schema changes, applied with `npx supabase db push`) and `functions/<slug>/index.ts` (Edge Function sources, deployed with `npx supabase functions deploy <slug>`).
- `src/Values.ts` — constants: hostname, asset URLs, menu commands, defaults.

## Versioning and release

- Bump `version` in both `package.json` and `vite.config.ts` (userscript metadata) together.
- Add a `## [x.y.z] - YYYY-MM-DD` section to `CHANGELOG.md`; the release job extracts exactly that section into the GitHub release notes.
- CI (`.github/workflows/build.yaml`) builds every push. A commit message containing `[release]` uploads `dist/mcmodder.user.js` and creates tag `v<version>` (suffixed `_N` if the tag already exists).
