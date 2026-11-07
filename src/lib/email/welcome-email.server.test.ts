import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn(), send: vi.fn(), audit: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, auth: { admin: { getUserById: mocks.getUser } } } }));
vi.mock("./resend.server", () => ({ sendResendEmail: mocks.send }));
vi.mock("@/lib/master/master-audit.server", () => ({ writeMasterAudit: mocks.audit }));
import { sendRegistrationWelcome } from "./welcome-email.server";

function query(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "update", "order", "limit"]) q[method] = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

beforeEach(() => vi.resetAllMocks());
describe("completed registration welcome", () => {
  it("never contacts Resend for an existing company", async () => {
    mocks.from.mockReturnValue(query({ data: { welcome_email_eligible: false }, error: null }));
    await sendRegistrationWelcome("old-company", "owner");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("sends only after successful atomic claim with stored plan and recipient", async () => {
    mocks.from
      .mockReturnValueOnce(query({ data: { nome: "Cliente", status_cobranca: "trial", welcome_email_eligible: true, welcome_email_claimed_at: null, welcome_email_sent_at: null } }))
      .mockReturnValueOnce(query({ data: { from_name: "MIAnota", from_email: "mianota@zapyertech.com" } }))
      .mockReturnValueOnce(query({ data: { plan: { nome: "Plano Grátis" } } }))
      .mockReturnValueOnce(query({ data: { id: "new-company" } }))
      .mockReturnValueOnce(query({ error: null }));
    mocks.getUser.mockResolvedValue({ data: { user: { email: "new@example.com", email_confirmed_at: "2026-11-07" } } });
    mocks.send.mockResolvedValue({ id: "resend-message" });
    await sendRegistrationWelcome("new-company", "owner");
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: ["new@example.com"], idempotencyKey: "registration-welcome/new-company", html: expect.stringContaining("Plano Grátis") }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "email.welcome_sent" }));
  });

  it("does not send when another request already claimed the registration", async () => {
    mocks.from
      .mockReturnValueOnce(query({ data: { welcome_email_eligible: true, welcome_email_claimed_at: null, welcome_email_sent_at: null } }))
      .mockReturnValueOnce(query({ data: { from_email: "mianota@zapyertech.com" } }))
      .mockReturnValueOnce(query({ data: { plan: { nome: "Basic" } } }))
      .mockReturnValueOnce(query({ data: null }));
    mocks.getUser.mockResolvedValue({ data: { user: { email: "new@example.com", email_confirmed_at: "2026-11-07" } } });
    await sendRegistrationWelcome("new-company", "owner");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});