import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import type { TestInfo } from "@playwright/test";
import { PROSPECTO_COLUNAS_ESPERADAS } from "@/lib/validation/prospecto";

export interface ProspectosFixture {
  path: string;
  nomeUm: string;
  nomeDois: string;
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
  const digits = `${Date.now()}${seed}${index}`.replace(/\D/g, "").slice(-14);
  return digits.padStart(14, String(index));
}

export function createProspectosFixture(testInfo: TestInfo): ProspectosFixture {
  const seed = onlyAsciiIdentifier(`${testInfo.title}-${randomUUID()}`);
  const nomeUm = `PROVEDOR E2E ${seed} UM LTDA`;
  const nomeDois = `PROVEDOR E2E ${seed} DOIS LTDA`;
  const emailUm = `contato+${seed.toLowerCase()}1@provedorteste.com.br`;
  const emailDois = `financeiro+${seed.toLowerCase()}2@provedorteste.com.br`;

  const rows = [
    [...PROSPECTO_COLUNAS_ESPERADAS],
    [
      uniqueCnpj(seed, 1),
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
      uniqueCnpj(seed, 2),
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

  return { path, nomeUm, nomeDois, emailUm, emailDois };
}
