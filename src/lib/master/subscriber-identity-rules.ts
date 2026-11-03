/** Form values stay lowercase; the existing company constraint uses PF/PJ. */
export function personTypeForStorage(value: "pf" | "pj"): "PF" | "PJ" {
  if (value === "pf") return "PF";
  if (value === "pj") return "PJ";
  throw new Error("Tipo de pessoa inválido");
}

export function personTypeForForm(value: unknown): "pf" | "pj" {
  return String(value ?? "").toUpperCase() === "PJ" ? "pj" : "pf";
}