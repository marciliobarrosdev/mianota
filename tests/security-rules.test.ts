import { describe, expect, it } from "vitest";
import {
  adminRemovalBlock,
  eventStatus,
  filterEvents,
  sameEmailList,
  summarizeEvents,
} from "../src/lib/master/security-rules";

describe("adminRemovalBlock", () => {
  const list = ["a@x.com", "b@x.com", "c@x.com"];
  it("blocks removing yourself", () =>
    expect(adminRemovalBlock("a@x.com", list, "a@x.com", "c@x.com")).toBe("self"));
  it("blocks removing the installation owner", () =>
    expect(adminRemovalBlock("c@x.com", list, "a@x.com", "c@x.com")).toBe("owner"));
  it("blocks removing the last admin", () =>
    expect(adminRemovalBlock("b@x.com", ["b@x.com"], null, null)).toBe("last"));
  it("allows removing another admin", () =>
    expect(adminRemovalBlock("b@x.com", list, "a@x.com", "c@x.com")).toBeNull());
});

describe("billing events", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const ev = [
    { provider: "infinitepay", processed: true, error: null, buyer_email: "j@x.com", created_at: "2026-11-03T10:00:00Z" },
    { provider: "kiwify", processed: false, error: "empresa não encontrada", buyer_email: "k@x.com", created_at: "2026-11-03T09:00:00Z" },
    { provider: "kiwify", processed: true, error: "evento ignorado", buyer_email: null, created_at: "2026-10-01T09:00:00Z" },
  ];
  it("treats 'evento ignorado' as not an error", () => expect(eventStatus(ev[2])).toBe("ignored"));
  it("summarizes today, ok and errors in 24h", () =>
    expect(summarizeEvents(ev, now)).toEqual({ today: 2, ok: 2, errors: 1, errors24h: 1 }));
  it("filters by status and e-mail", () => {
    expect(filterEvents(ev, { status: "error" })).toHaveLength(1);
    expect(filterEvents(ev, { search: "J@X" })).toHaveLength(1);
  });
  it("compares admin lists ignoring order", () =>
    expect(sameEmailList(["b@x.com", "a@x.com"], ["a@x.com", "b@x.com"])).toBe(true));
});
