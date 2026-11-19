# "Prontos para cobrar" shows only paid plans

In Master → Pagamentos, the "Prontos para cobrar" list and its counter will count only paid plans. Today they also include Gratuito, which shows "Falta informar o link de checkout" and leaves the counter at 2/3.

## What you will see
- The list shows Basic and Pro only, and the counter reads 2/2 when both have their InfinitePay link.
- The "Faça uma venda sair do outro lado" step in "Comece aqui" uses the same paid-plan count, so it no longer stays pending because of the free plan.
- Gratuito keeps showing normally in Master → Planos and on the subscriber's plan page.

## Technical details
- In `src/lib/master/master-setup.functions.ts`, add `const paidPlans = plans.filter((p) => !p.is_free)` and use it in `plansWithCheckout`, `paymentPlans` and `paymentsReady`. Keep `counts.plans` for the Pagamentos counter, but set it to the number of paid plans (or add `counts.paidPlans` and use it in `src/routes/master/pagamentos.tsx`).
- Move the "who needs a checkout link" rule into a small pure helper (`paidPlansForCheckout`) and test it in `tests/`: a free plan never appears, a paid plan without a link counts as not ready.
- Check Master → Pagamentos in the browser, signed in as Super Admin.
