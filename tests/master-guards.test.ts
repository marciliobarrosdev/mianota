import { describe, expect, it } from "vitest";
import { assertSuperAdmin, SUPER_ADMIN_DENIED } from "@/lib/master/master-guards";

const client = (result: { data: unknown; error: unknown }) => ({ rpc: async () => result });

describe("assertSuperAdmin", () => {
  it("allows the installation owner", async () => {
    await expect(assertSuperAdmin(client({ data: true, error: null }))).resolves.toBeUndefined();
  });
  it("blocks anyone else", async () => {
    await expect(assertSuperAdmin(client({ data: false, error: null }))).rejects.toThrow(SUPER_ADMIN_DENIED);
  });
  it("never shows the database error to the user", async () => {
    await expect(
      assertSuperAdmin(client({ data: null, error: { message: "relation secret_x" } })),
    ).rejects.toThrow(/^Não foi possível validar o acesso/);
  });
});
