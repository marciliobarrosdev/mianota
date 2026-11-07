import { describe, expect, it } from "vitest";
import { mapResendEvent, signSvix, verifySvix } from "./resend-webhook-rules";

const secret = "whsec_" + btoa("super-secret-key-for-tests-123456");
const body = JSON.stringify({ type: "email.delivered", created_at: "2026-11-07T01:00:00Z", data: { email_id: "abc", to: ["a@b.com"], subject: "Oi" } });

describe("verifySvix", () => {
  it("accepts a valid signature", async () => {
    const sig = await signSvix(secret, "msg_1", "1000", body);
    expect(await verifySvix({ secret, id: "msg_1", timestamp: "1000", signature: `v1,${sig}`, body, nowSeconds: 1000 })).toBe(true);
  });
  it("rejects a tampered body", async () => {
    const sig = await signSvix(secret, "msg_1", "1000", body);
    expect(await verifySvix({ secret, id: "msg_1", timestamp: "1000", signature: `v1,${sig}`, body: body + "x", nowSeconds: 1000 })).toBe(false);
  });
  it("rejects old timestamps (over 5 minutes)", async () => {
    const sig = await signSvix(secret, "msg_1", "1000", body);
    expect(await verifySvix({ secret, id: "msg_1", timestamp: "1000", signature: `v1,${sig}`, body, nowSeconds: 1301 })).toBe(false);
  });
});

describe("mapResendEvent", () => {
  it("extracts message fields", () => {
    expect(mapResendEvent(JSON.parse(body))).toEqual({ event_type: "email.delivered", message_id: "abc", recipient: "a@b.com", subject: "Oi", occurred_at: "2026-11-07T01:00:00Z" });
  });
});
