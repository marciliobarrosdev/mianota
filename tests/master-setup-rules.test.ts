import { describe, expect, it } from "vitest";
import { groupSetupChecks, isRecent, setupProgress, setupStatus, timeAgo } from "@/lib/master/master-setup-rules";

describe("checklist do Master", () => {
  it("opcional pendente é atenção, obrigatório pendente é falta", () => {
    expect(setupStatus(false, true)).toBe("attention");
    expect(setupStatus(false, false)).toBe("missing");
    expect(setupStatus(true, false)).toBe("ready");
  });

  it("progresso conta só obrigatórios", () => {
    const p = setupProgress([
      { group: "vender", ready: true, optional: false },
      { group: "vender", ready: false, optional: false },
      { group: "avisar", ready: false, optional: true },
    ]);
    expect(p).toMatchObject({ completed: 1, total: 2, percent: 50, pending: 1, readyToLaunch: false });
  });

  it("agrupa em blocos e omite blocos vazios", () => {
    const g = groupSetupChecks([{ group: "atender", ready: true, optional: false }]);
    expect(g.map((x) => x.id)).toEqual(["atender"]);
    expect(g[0].percent).toBe(100);
  });

  it("tempo relativo e recência", () => {
    const now = new Date("2026-11-03T12:00:00Z");
    expect(timeAgo("2026-11-03T11:55:00Z", now)).toBe("há 5 min");
    expect(timeAgo("2026-11-01T12:00:00Z", now)).toBe("há 2 dias");
    expect(timeAgo(null, now)).toBeNull();
    expect(isRecent("2026-11-02T00:00:00Z", 48, now)).toBe(true);
    expect(isRecent("2026-10-30T00:00:00Z", 48, now)).toBe(false);
  });
});
