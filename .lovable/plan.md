# Code review and refactor plan for MIAnota

A full rewrite would put payments, the WhatsApp channel and saved data at risk. Instead, this plan fixes the problems found in the code one step at a time, without changing what users see. After every step the system keeps working and is checked before moving on.

## What the review found
1. **Super Admin check copied 9 times.** There is one shared version (`master-guards.ts`), but 8 other files have their own copy. The error messages differ, and some show the database error while others don't. Risk: a future change to who counts as an owner only takes effect in part of the Master.
2. **Very large files mixing several jobs.** Fourteen files are between about 570 and 890 lines. The biggest:
   - the finance dashboard functions (888 lines)
   - finance on WhatsApp (726)
   - Master subscriber functions (713)
   - planning (703)
   - Master and subscriber Configurações (about 680–700 each)
   - the MIA chat (663)
   - Master and subscriber Conversas (about 570–600)
   They are hard to change without breaking something next to them.
3. **Errors swallowed silently.** There are 11 places where a failure is ignored without any record, including 4 in the WhatsApp connection (Evolution) and in Conversas. Risk: a real WhatsApp or loading failure looks like "nothing happened". The 3 in cookie preferences are correct (blocked browser storage) and stay.
4. **Lists with a silent cap.** Conversas, subscribers, leads and security load at most 200–500 rows, with no warning or "load more". With more subscribers, older items simply disappear from the screen.
5. **Loose typing.** About 630 spots with `any`, and 61 files that turn that check off entirely. Risk: renaming a database field only shows up as an error for the user, not while building.
6. **Loading inside the screen instead of before it.** 30 screens fetch data after they open (`useEffect`). This causes slower loads and the brief flash of an empty screen.

Security: this review doesn't replace the security scan. Run a full scan in the Security tab. I don't call the system "secure" without it.

## Order of work (each step keeps the system working)
1. **One Super Admin check.** All 8 copies use `master-guards.ts`, with the same message. Check: tests, plus opening the Master pages signed in.
2. **Visible errors.** Ignored failures get a server record, and a message for the user where it makes sense. Check: tests, plus Conversas and the WhatsApp connection in the browser.
3. **Lists with "Carregar mais".** Conversas, Master subscribers, leads and the security history use pages, with no silent cap. Check: the page totals match the count in the database.
4. **Split large files.** One file per step, following the existing rule (pure rules in `*-rules.ts` with tests, data in hooks or `*.server.ts`, UI pieces in `components/<area>`). Order:
   - finance dashboard
   - finance on WhatsApp
   - Master subscribers
   - planning
   - both Configurações pages
   - MIA chat
   - both Conversas pages
   Check after each: tests, plus the page in the browser on phone and computer, in light and dark themes.
5. **Loading before opening.** The most-used screens (Início, Movimentações, Master overview, Assinantes) move to loading before the page appears. Check: no empty flash, no errors.
6. **Typing.** Remove `any` from the files touched in the steps above, using the real database types.
7. **Comments and docs.** Comments only where the logic isn't obvious (business rules, payments, WhatsApp). Record each step in README, MANUAL and NOVAS-IMPLEMENTAÇÕES.

## What stays the same
- Screens, texts, prices, plans, the InfinitePay flow, the central WhatsApp channel, saved data and logins.
- The database: no table or column is renamed or deleted.

## Technical details
- Shared guard: `assertSuper(supabase)` in `src/lib/master/master-guards.ts`. Remove the local copies in `master-whatsapp`, `master-setup`, `master-onboarding`, `settings`, `notification-broadcast`, `ai-config`, `integrations`, `billing` and `master-security`.
- Pagination: `.range()` plus `count: "exact"` on the server, and a `useInfiniteQuery` or "Carregar mais" button in the UI.
- Loaders: `ensureQueryData` in the route plus `useSuspenseQuery` in the component, keeping `guardAfterHydration` on the protected areas.
- Every step runs `vitest` and the `test:clone-security` scripts, and is checked in the browser signed in, before moving on.
