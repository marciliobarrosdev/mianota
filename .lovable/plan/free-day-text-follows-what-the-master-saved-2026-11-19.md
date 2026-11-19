# Free-day text follows what the Master saved

The subscriber's plan page will use only the number of free days saved for each plan in Master → Planos. Today Basic and Pro are saved with 0 days, and the fixed "3" goes away.

## What the subscriber will see
- **Plans with 0 days (Basic and Pro today):**
  - The card no longer shows "0 dias grátis — sem cartão".
  - The text below says the plan and its price, with no mention of a trial.
  - The button changes from "Começar 3 dias grátis" to "Assinar <plano>".
- **Plans with free days (for example Gratuito, 7 days):** the card, the text and the button all show the same real number: "Começar 7 dias grátis".
- **Top badge:**
  - It shows the number of days of the selected plan.
  - With no plan selected, or with 0 days, it changes to "Escolha seu plano".
  - The heading "Comece grátis em segundos" and the line "você não precisa pagar agora" only appear when a plan with free days is selected.
- **Hint shown before choosing a plan:** "Escolha um plano acima para começar."

If you later turn on a trial for Basic or Pro in Master → Planos, the page will show that number automatically.

## Technical details
- File: `src/routes/app/checkout.tsx` only, changing text only. What the button does stays the same (`iniciarTrial`).
- Remove every `?? 3`. Add `const hasTrial = (plano?.trial_days ?? 0) > 0` and use it for the conditional texts, the top badge and the button label.
- Card: show the "dias grátis" line only when `p.trial_days > 0`.
- Add a small pure helper in `src/lib/billing/` that returns the button label and badge from `trial_days`. Test it in `tests/` for three cases: 0 days gives "Assinar Basic", 7 days gives "Começar 7 dias grátis", no plan gives "Escolha seu plano".
- Check the page in the browser on phone and computer, in light and dark themes.
