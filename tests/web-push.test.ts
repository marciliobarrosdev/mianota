import { describe, expect, it } from "vitest";
import {
  b64urlToBytes,
  bytesToB64url,
  encryptPayload,
  isExpiredSubscriptionStatus,
  vapidJwt,
} from "@/lib/finance/web-push.server";

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource }, k, len * 8),
  );
}

describe("web push", () => {
  it("encrypted payload decrypts back with the browser's keys (aes128gcm)", async () => {
    const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    const uaPub = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const msg = JSON.stringify({ title: "Olá" });
    const out = await encryptPayload(new TextEncoder().encode(msg), bytesToB64url(uaPub), bytesToB64url(auth));

    const salt = out.slice(0, 16);
    expect(out[20]).toBe(65);
    const asPub = out.slice(21, 86);
    const asKey = await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256));
    const te = new TextEncoder();
    const info = new Uint8Array([...te.encode("WebPush: info\0"), ...uaPub, ...asPub]);
    const ikm = await hkdf(auth, shared, info, 32);
    const cek = await hkdf(salt, ikm, te.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, ikm, te.encode("Content-Encoding: nonce\0"), 12);
    const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, out.slice(86)));
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe(msg);
  });

  it("VAPID JWT is a verifiable ES256 token", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const jwt = await vapidJwt("https://fcm.googleapis.com", "mailto:a@b.c", bytesToB64url(pub), jwk.d!);
    const [h, b, s] = jwt.split(".");
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey, b64urlToBytes(s), new TextEncoder().encode(`${h}.${b}`));
    expect(ok).toBe(true);
  });

  it("deactivates only on 404/410", () => {
    expect(isExpiredSubscriptionStatus(410)).toBe(true);
    expect(isExpiredSubscriptionStatus(404)).toBe(true);
    expect(isExpiredSubscriptionStatus(500)).toBe(false);
  });
});
