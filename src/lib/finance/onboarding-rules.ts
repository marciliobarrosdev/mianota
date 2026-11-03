export type OnboardingSignals = {
  movements: number;
  whatsappLinked: boolean;
  scheduled: number;
  pushDevices: number;
  profileCustomized: boolean;
  budgetsOrGoals: number;
  paidPlan: boolean;
};

export type OnboardingStepId =
  | "first_entry"
  | "whatsapp"
  | "schedule"
  | "push"
  | "teach_mia"
  | "budget"
  | "plan";

export const ONBOARDING_ORDER: { id: OnboardingStepId; essential: boolean }[] = [
  { id: "first_entry", essential: true },
  { id: "schedule", essential: true },
  { id: "plan", essential: true },
  { id: "whatsapp", essential: false },
  { id: "push", essential: false },
  { id: "teach_mia", essential: false },
  { id: "budget", essential: false },
];

export function onboardingDone(s: OnboardingSignals): Record<OnboardingStepId, boolean> {
  return {
    first_entry: s.movements > 0,
    whatsapp: s.whatsappLinked,
    schedule: s.scheduled > 0,
    push: s.pushDevices > 0,
    teach_mia: s.profileCustomized,
    budget: s.budgetsOrGoals > 0,
    plan: s.paidPlan,
  };
}

export function onboardingProgress(s: OnboardingSignals) {
  const done = onboardingDone(s);
  const total = ONBOARDING_ORDER.length;
  const completed = ONBOARDING_ORDER.filter((x) => done[x.id]).length;
  const next = ONBOARDING_ORDER.find((x) => !done[x.id])?.id ?? null;
  return { done, total, completed, percent: Math.round((completed / total) * 100), next };
}
