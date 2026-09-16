const CNPJ_MASK_CHARS_PATTERN = /[./-]/g;
const CNPJ_ALLOWED_CHARS_PATTERN = /^[A-Z0-9]+$/;
const CNPJ_CANONICAL_PATTERN = /^[A-Z0-9]{12}\d{2}$/;
const CNPJ_DISPLAY_PATTERN = /^[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2}$/;
const NUMERIC_CNPJ_REPEATED_PATTERN = /^(\d)\1{13}$/;
const CNPJ_FIRST_DV_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const CNPJ_SECOND_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const ZERO_CHAR_CODE = 48;

export const cnpjDisplayPattern = CNPJ_DISPLAY_PATTERN;

export type CnpjKind = "numeric" | "alphanumeric";

export type CnpjValidationErrorCode =
  | "EMPTY"
  | "INVALID_CHARACTERS"
  | "INVALID_LENGTH"
  | "INVALID_CHECK_DIGITS"
  | "INVALID_REPEATED_NUMERIC";

export interface CnpjParseSuccess {
  ok: true;
  canonical: string;
  formatted: string;
  kind: CnpjKind;
}

export interface CnpjParseFailure {
  ok: false;
  code: CnpjValidationErrorCode;
  message: string;
}

export type CnpjParseResult = CnpjParseSuccess | CnpjParseFailure;

export function canonicalizeCnpjInput(input: unknown): string {
  return String(input ?? "")
    .trim()
    .replace(CNPJ_MASK_CHARS_PATTERN, "")
    .toUpperCase();
}

function cnpjCharValue(char: string): number {
  return char.charCodeAt(0) - ZERO_CHAR_CODE;
}

function calculateDigit(value: string, weights: readonly number[]): string {
  const sum = weights.reduce(
    (total, weight, index) => total + cnpjCharValue(value[index]) * weight,
    0,
  );
  const remainder = sum % 11;
  const digit = remainder < 2 ? 0 : 11 - remainder;
  return String.fromCharCode(ZERO_CHAR_CODE + digit);
}

export function calculateCnpjCheckDigits(base12: string): string | null {
  const canonicalBase = canonicalizeCnpjInput(base12);
  if (canonicalBase.length !== 12 || !CNPJ_ALLOWED_CHARS_PATTERN.test(canonicalBase)) {
    return null;
  }

  const firstDigit = calculateDigit(canonicalBase, CNPJ_FIRST_DV_WEIGHTS);
  const secondDigit = calculateDigit(`${canonicalBase}${firstDigit}`, CNPJ_SECOND_DV_WEIGHTS);
  return `${firstDigit}${secondDigit}`;
}

export function parseCnpj(input: unknown): CnpjParseResult {
  const canonical = canonicalizeCnpjInput(input);

  if (!canonical) {
    return { ok: false, code: "EMPTY", message: "CNPJ é obrigatório." };
  }

  if (!CNPJ_ALLOWED_CHARS_PATTERN.test(canonical)) {
    return {
      ok: false,
      code: "INVALID_CHARACTERS",
      message: "CNPJ deve conter apenas letras, números, ponto, barra ou hífen.",
    };
  }

  if (canonical.length !== 14 || !CNPJ_CANONICAL_PATTERN.test(canonical)) {
    return {
      ok: false,
      code: "INVALID_LENGTH",
      message: "CNPJ deve ter 12 caracteres alfanuméricos e 2 dígitos verificadores.",
    };
  }

  if (NUMERIC_CNPJ_REPEATED_PATTERN.test(canonical)) {
    return {
      ok: false,
      code: "INVALID_REPEATED_NUMERIC",
      message: "CNPJ numérico repetido não é válido.",
    };
  }

  const expectedDigits = calculateCnpjCheckDigits(canonical.slice(0, 12));
  if (expectedDigits !== canonical.slice(12)) {
    return {
      ok: false,
      code: "INVALID_CHECK_DIGITS",
      message: "CNPJ não passa na validação de dígito verificador.",
    };
  }

  return {
    ok: true,
    canonical,
    formatted: `${canonical.slice(0, 2)}.${canonical.slice(2, 5)}.${canonical.slice(5, 8)}/${canonical.slice(8, 12)}-${canonical.slice(12)}`,
    kind: /[A-Z]/.test(canonical.slice(0, 12)) ? "alphanumeric" : "numeric",
  };
}

export function isValidCnpj(input: unknown): boolean {
  return parseCnpj(input).ok;
}

export function formatCnpj(input: unknown): string {
  const parsed = parseCnpj(input);
  return parsed.ok ? parsed.formatted : String(input ?? "");
}

export function isAlphanumericCnpj(input: unknown): boolean {
  const parsed = parseCnpj(input);
  return parsed.ok && parsed.kind === "alphanumeric";
}

export function isNumericCnpj(input: unknown): boolean {
  const parsed = parseCnpj(input);
  return parsed.ok && parsed.kind === "numeric";
}
