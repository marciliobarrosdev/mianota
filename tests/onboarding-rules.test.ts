import { describe, expect, it } from "vitest";
import { onboardingProgress } from "../src/lib/onboarding-rules";

const empty = { movements: 0, whatsappLinked: false, scheduled: 0, pushDevices: 0, profileCustomized: false, budgetsOrGoals: 0, paidPlan: false };

describe("onboarding progress", () => {
  it("counts 7 steps and starts at first entry", () => {
    const p = onboardingProgress(empty);
    expect(p.total).toBe(7);
    expect(p.completed).toBe(0);
    expect(p.next).toBe("first_entry");
  });
  it("marks steps done from real signals", () => {
    const p = onboardingProgress({ ...empty, movements: 2, scheduled: 1 });
    expect(p.completed).toBe(2);
    expect(p.percent).toBe(29);
    expect(p.next).toBe("plan");
  });
  it("is 100% when all done", () => {
    const p = onboardingProgress({ movements: 1, whatsappLinked: true, scheduled: 1, pushDevices: 1, profileCustomized: true, budgetsOrGoals: 1, paidPlan: true });
    expect(p.percent).toBe(100);
    expect(p.next).toBeNull();
  });
});
