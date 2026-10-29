// Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) using only Web Crypto,
// so it runs on the Worker runtime (the `web-push` npm lib needs Node crypto).

const enc = new TextEncoder();

export function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

export async function encryptPayload(
  plaintext: Uint8Array,
  p256dh: string,
  authSecret: string,
  saltOverride?: Uint8Array,
) {
  const uaPublic = b64urlToBytes(p256dh);
  const auth = b64urlToBytes(authSecret);
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, pair.privateKey, 256),
  );
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(auth, shared, keyInfo, 32);
  const salt = saltOverride ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce as BufferSource },
      aesKey,
      concat(plaintext, new Uint8Array([2])) as BufferSource,
    ),
  );
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

export async function vapidJwt(audience: string, subject: string, publicKey: string, privateKey: string) {
  const pub = b64urlToBytes(publicKey);
  if (pub.length !== 65) throw new Error("VAPID_PUBLIC_KEY inválida.");
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privateKey.trim(),
    x: bytesToB64url(pub.slice(1, 33)),
    y: bytesToB64url(pub.slice(33, 65)),
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
  const head = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = bytesToB64url(
    enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })),
  );
  const unsigned = `${head}.${body}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(unsigned)),
  );
  return `${unsigned}.${bytesToB64url(sig)}`;
}

/** Subscriptions answered with 404/410 are gone for good and must be deactivated. */
export function isExpiredSubscriptionStatus(status: number) {
  return status === 404 || status === 410;
}

export type PushTarget = { endpoint: string; p256dh: string; auth_secret: string };

export async function sendWebPush(target: PushTarget, payload: unknown) {
  const publicKey = (process.env["VAPID_PUBLIC_KEY"] || "").trim();
  const privateKey = (process.env["VAPID_PRIVATE_KEY"] || "").trim();
  if (!publicKey || !privateKey) throw new Error("Chaves VAPID não configuradas.");
  const subject = (process.env["VAPID_SUBJECT"] || "mailto:suporte@mianota.lovable.app").trim();
  const audience = new URL(target.endpoint).origin;
  const jwt = await vapidJwt(audience, subject, publicKey, privateKey);
  const body = await encryptPayload(enc.encode(JSON.stringify(payload)), target.p256dh, target.auth_secret);
  const res = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "normal",
    },
    body: body as BodyInit,
  });
  return { status: res.status, ok: res.ok, text: res.ok ? "" : (await res.text()).slice(0, 300) };
}

export type PushMessage = { title: string; body?: string | null; url?: string; tag?: string; notificationId?: string };

/** Sends to every active device of the user; deactivates expired ones. */
export async function sendPushToUser(admin: any, companyId: string, userId: string, msg: PushMessage) {
  const { data: subs, error } = await admin
    .from("marcia_push_subscription")
    .select("id,endpoint,p256dh,auth_secret")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("active", true);
  if (error) throw error;
  let sent = 0;
  let failed = 0;
  for (const sub of subs || []) {
    try {
      const r = await sendWebPush(sub, msg);
      if (r.ok) sent++;
      else {
        failed++;
        if (isExpiredSubscriptionStatus(r.status)) {
          await admin.from("marcia_push_subscription").update({ active: false }).eq("id", sub.id);
        } else console.error("[push] envio falhou", r.status, r.text);
      }
    } catch (e) {
      failed++;
      console.error("[push] erro", e);
    }
  }
  return { devices: (subs || []).length, sent, failed };
}
