import { expect, test } from "@playwright/test";
import {
  calculateCnpjCheckDigits,
  formatCnpj,
  parseCnpj,
} from "@/lib/cnpj/cnpj";
import { createEmpresaSchema } from "@/lib/validation/empresa";
import { formatarCnpj } from "@/lib/validation/promocao-prospecto";
import { normalizarCnpjPlanilha } from "@/lib/validation/prospecto";
import { createSindicatoSchema } from "@/lib/validation/sindicato";

test.describe("RF-01 CNPJ alfanumérico", () => {
  test("valida, normaliza e formata CNPJ numérico legado", () => {
    const parsed = parseCnpj("11.222.333/0001-81");

    expect(parsed).toMatchObject({
      ok: true,
      canonical: "11222333000181",
      formatted: "11.222.333/0001-81",
      kind: "numeric",
    });
  });

  test("valida, normaliza e formata CNPJ alfanumérico oficial", () => {
    const parsed = parseCnpj("00.000.000/e08g-12");

    expect(parsed).toMatchObject({
      ok: true,
      canonical: "00000000E08G12",
      formatted: "00.000.000/E08G-12",
      kind: "alphanumeric",
    });
  });

  test("rejeita caracteres proibidos, tamanho inválido e dígito verificador inválido", () => {
    expect(parseCnpj("00.000.000/E08*-12")).toMatchObject({
      ok: false,
      code: "INVALID_CHARACTERS",
    });
    expect(parseCnpj("00.000.000/E08G")).toMatchObject({
      ok: false,
      code: "INVALID_LENGTH",
    });
    expect(parseCnpj("00.000.000/E08G-13")).toMatchObject({
      ok: false,
      code: "INVALID_CHECK_DIGITS",
    });
  });

  test("aplica a mesma regra em empresa, sindicato, promoção e importação de prospectos", () => {
    const tenantId = "11111111-1111-4111-8111-111111111111";
    const alpha = "00.000.000/e08g-12";

    const empresa = createEmpresaSchema.parse({
      tenantId,
      razaoSocial: "Empresa Alfanumerica Ltda",
      cnpj: alpha,
    });
    const sindicato = createSindicatoSchema.parse({
      razaoSocial: "Sindicato Alfanumerico",
      cnpj: alpha,
      slug: "sindicato-alfanumerico",
    });

    expect(empresa.cnpj).toBe("00.000.000/E08G-12");
    expect(sindicato.cnpj).toBe("00.000.000/E08G-12");
    expect(formatarCnpj("00000000e08g12")).toBe("00.000.000/E08G-12");
    expect(normalizarCnpjPlanilha(alpha)).toBe("00000000E08G12");
    expect(calculateCnpjCheckDigits("00000000E08G")).toBe("12");
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});
