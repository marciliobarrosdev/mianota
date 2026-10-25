import { randomBytes, randomUUID } from "node:crypto";

/** Server-only credential material; never import this module from client code. */
export function generateTemporaryPassword(): string {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

/** Correlates one provisioning attempt across an ambiguous network response. */
export function generateProvisionKey(): string {
  return randomUUID();
}

/** Opaque OAuth nonce. Only its SHA-256 hash is stored in the database. */
export function generateOAuthStateToken(): string {
  return randomBytes(32).toString("base64url");
}
