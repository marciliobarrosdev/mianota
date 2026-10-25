import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

function expect(file, pattern, message) {
  if (!pattern.test(read(file))) failures.push(`${message} (${file})`);
}

expect("src/routes/master.tsx", /\/master\/checklist/, "Menu deve abrir a implantação guiada");
expect("src/routes/master.tsx", /\/master\/pagamentos/, "Pagamentos devem ter uma área própria");
expect(
  "src/routes/master/checklist.tsx",
  /checklist automático/,
  "Checklist deve explicar a autoconferência",
);
expect(
  "src/lib/master-setup.functions.ts",
  /plansWithCheckout/,
  "Checklist deve conferir checkout por plano",
);
expect(
  "src/lib/master-setup.functions.ts",
  /platform_support_channel/,
  "Checklist deve conferir o WhatsApp de suporte",
);
expect(
  "src/routes/master/pagamentos.tsx",
  /Segredo do webhook/,
  "Guia de Stripe deve orientar o webhook",
);
expect(
  "src/routes/master/pagamentos.tsx",
  /conferência por plano/,
  "Pagamentos devem mostrar cobertura por plano",
);
expect(
  "src/routes/master/implantacao.tsx",
  /nunca neste painel/,
  "Marca deve continuar sendo alterada por prompt",
);

if (
  /open-finance|Open Finance|Pluggy/i.test(
    read("src/routes/master.tsx") + read("src/routes/master/checklist.tsx"),
  )
) {
  failures.push("Conexão bancária não deve aparecer no superadmin");
}

if (failures.length) {
  console.error("\nFalhas na implantação guiada do Master:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Superadmin guiado: checklist e cobrança verificados.");
