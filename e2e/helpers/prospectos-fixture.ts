import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import type { TestInfo } from "@playwright/test";
import { calculateCnpjCheckDigits } from "@/lib/cnpj/cnpj";
import { PROSPECTO_COLUNAS_ESPERADAS } from "@/lib/validation/prospecto";

export interface ProspectosFixture {
  path: string;
  nomeUm: string;
  nomeDois: string;
  cnpjUm: string;
  cnpjDois: string;
  emailUm: string;
  emailDois: string;
}

function onlyAsciiIdentifier(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
}

function uniqueCnpj(seed: string, index: number) {
  const base = `${Date.now()}${seed}${index}`
    .replace(/\D/g, "")
    .slice(-12)
    .padStart(12, String(index));
  const checkDigits = calculateCnpjCheckDigits(base);
  if (!checkDigits) {
    throw new Error(`Não foi possível gerar DV para CNPJ numérico E2E: ${base}`);
  }
  return `${base}${checkDigits}`;
}

function uniqueAlphanumericCnpj(seed: string, index: number) {
  const base = `A${seed}${index}`.padEnd(12, "0").slice(0, 12);
  const checkDigits = calculateCnpjCheckDigits(base);
  if (!checkDigits) {
    throw new Error(`Não foi possível gerar DV para CNPJ alfanumérico E2E: ${base}`);
  }
  return `${base}${checkDigits}`;
}

export function createProspectosFixture(
  testInfo: TestInfo,
  options: { alphanumeric?: boolean } = {},
): ProspectosFixture {
  const seed = onlyAsciiIdentifier(`${testInfo.title}-${randomUUID()}`);
  const nomeUm = `PROVEDOR E2E ${seed} UM LTDA`;
  const nomeDois = `PROVEDOR E2E ${seed} DOIS LTDA`;
  const cnpjUm = options.alphanumeric ? uniqueAlphanumericCnpj(seed, 1) : uniqueCnpj(seed, 1);
  const cnpjDois = uniqueCnpj(seed, 2);
  const emailUm = `contato+${seed.toLowerCase()}1@provedorteste.com.br`;
  const emailDois = `financeiro+${seed.toLowerCase()}2@provedorteste.com.br`;

  const rows = [
    [...PROSPECTO_COLUNAS_ESPERADAS],
    [
      cnpjUm,
      nomeUm,
      "Provedores de acesso as redes de comunicacoes",
      "",
      100000,
      "100000.00",
      emailUm,
      "RUA TESTE",
      "100",
      "SALA 1",
      "CENTRO",
      "FORTALEZA",
      "CE",
      "60000-000",
    ],
    [
      cnpjDois,
      nomeDois,
      "Provedores de acesso as redes de comunicacoes",
      "6110-8/03",
      50000,
      "50000.00",
      emailDois,
      "AV TESTE",
      "200",
      "",
      "ALDEOTA",
      "FORTALEZA",
      "CE",
      "60100-000",
    ],
    ["CNPJINVALIDO", "EMPRESA CNPJ INVALIDO LTDA", "Provedores"],
    [uniqueCnpj(seed, 3), ""],
  ];

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Leads_rel");

  const path = testInfo.outputPath(`prospectos-${seed.toLowerCase()}.xlsx`);
  XLSX.writeFile(workbook, path);

  return { path, nomeUm, nomeDois, cnpjUm, cnpjDois, emailUm, emailDois };
}
