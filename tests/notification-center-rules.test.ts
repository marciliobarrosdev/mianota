import { describe, expect, it } from "vitest";
import {
  countNotices,
  filterNotices,
  groupNoticesByDay,
  postponedDueDate,
  relativeNoticeDate,
  summarizeDueThisWeek,
  type Notice,
} from "@/lib/finance/notification-center-rules";

const notice = (over: Partial<Notice>): Notice => ({
  id: crypto.randomUUID(),
  company_id: "c",
  recipient_user_id: "u",
  type: "system.info",
  title: "Aviso",
  body: null,
  entity_type: null,
  entity_id: null,
  data: null,
  read_at: null,
  archived_at: null,
  priority: null,
  created_at: "2026-11-07T12:00:00Z",
  ...over,
});

describe("central de notificações", () => {
  it("soma cada conta da semana uma única vez, mesmo com vários avisos", () => {
    const bill = {
      type: "finance.due",
      entity_id: "L1",
      data: { dueDate: "2026-11-09", amountCents: 15000 },
    };
    const items = [
      notice(bill),
      notice(bill),
      notice({
        type: "finance.due",
        entity_id: "L2",
        data: { dueDate: "2026-11-05", amountCents: 5000 },
      }),
      notice({
        type: "finance.due",
        entity_id: "L3",
        data: { dueDate: "2026-11-20", amountCents: 9900 },
      }),
    ];
    expect(summarizeDueThisWeek(items, "2026-11-07")).toEqual({
      count: 2,
      total: 20000,
      overdue: 1,
    });
  });

  it("adiar conta atrasada leva para amanhã; conta futura ganha +1 dia", () => {
    expect(postponedDueDate("2026-11-01", "2026-11-07")).toBe("2026-11-08");
    expect(postponedDueDate("2026-11-10", "2026-11-07")).toBe("2026-11-11");
    expect(postponedDueDate("2026-12-31", "2026-11-07")).toBe("2027-01-01");
  });

  it("conta não lidas e filtra por não lidas", () => {
    const items = [notice({}), notice({ read_at: "2026-11-07T13:00:00Z" })];
    expect(countNotices(items).unread).toBe(1);
    expect(countNotices(items).all).toBe(2);
    expect(filterNotices(items, "unread")).toHaveLength(1);
  });

  it("agrupa avisos na ordem Hoje → Mais antigas", () => {
    const now = new Date("2026-11-07T15:00:00Z");
    const groups = groupNoticesByDay(
      [
        notice({ created_at: "2026-10-01T12:00:00Z" }),
        notice({ created_at: "2026-11-07T14:00:00Z" }),
      ],
      now,
    ).map(([g]) => g);
    expect(groups).toEqual(["Hoje", "Mais antigas"]);
  });

  it("data relativa", () => {
    const now = new Date("2026-11-07T15:00:00Z").getTime();
    expect(relativeNoticeDate("2026-11-07T14:59:40Z", now)).toBe("agora");
    expect(relativeNoticeDate("2026-11-07T14:30:00Z", now)).toBe("há 30 min");
    expect(relativeNoticeDate("2026-11-07T12:00:00Z", now)).toBe("há 3 h");
  });
});
