import { createHash } from "node:crypto";

function decodeDate(value) {
  if (!value || !/^\d{8}$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function nullable(value) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function yesNo(value) {
  if (value === "S") return true;
  if (value === "N") return false;
  return null;
}

export async function* parseDelimited(readable, { encoding = "windows-1252", delimiter = ";" } = {}) {
  const decoder = new TextDecoder(encoding);
  let field = "";
  let row = [];
  let quoted = false;
  let pendingQuote = false;
  let sawCarriageReturn = false;

  const consume = function* (text) {
    for (const char of text) {
      if (sawCarriageReturn) {
        sawCarriageReturn = false;
        if (char === "\n") continue;
      }
      if (quoted) {
        if (pendingQuote) {
          if (char === '"') {
            field += '"';
            pendingQuote = false;
            continue;
          }
          quoted = false;
          pendingQuote = false;
        } else if (char === '"') {
          pendingQuote = true;
          continue;
        } else {
          field += char;
          continue;
        }
      }

      if (char === '"' && field.length === 0) quoted = true;
      else if (char === delimiter) {
        row.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        row.push(field);
        field = "";
        if (row.some((value) => value.length > 0)) yield row;
        row = [];
        sawCarriageReturn = char === "\r";
      } else {
        field += char;
      }
    }
  };

  for await (const chunk of readable) {
    yield* consume(decoder.decode(chunk, { stream: true }));
  }
  yield* consume(decoder.decode());
  if (quoted && !pendingQuote) throw new Error("Unterminated quoted field");
  if (pendingQuote) quoted = false;
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    yield row;
  }
}

export function recordHash(fields) {
  return createHash("sha256").update(fields.join("\u001f")).digest("hex");
}

export function parseCnae(fields) {
  if (fields.length < 2 || !/^\d{7}$/.test(fields[0])) throw new Error("Invalid CNAE row");
  return { code: fields[0], description: fields[1].trim(), source_record_hash: recordHash(fields) };
}

export function parseCompany(fields) {
  if (fields.length < 7 || !/^[A-Z0-9]{8}$/.test(fields[0].toUpperCase())) {
    throw new Error("Invalid company row");
  }
  const capital = fields[4] ? Number(fields[4].replace(",", ".")) : null;
  if (capital !== null && !Number.isFinite(capital)) throw new Error("Invalid share capital");
  return {
    cnpj_root: fields[0].toUpperCase(),
    legal_name: fields[1].trim(),
    legal_nature_code: nullable(fields[2]),
    responsible_qualification_code: nullable(fields[3]),
    share_capital: capital,
    company_size_code: nullable(fields[5]),
    federative_entity: nullable(fields[6]),
    source_record_hash: recordHash(fields),
  };
}

export function parseEstablishment(fields) {
  if (fields.length < 30) throw new Error("Invalid establishment row length");
  const root = fields[0].toUpperCase();
  const order = fields[1].toUpperCase();
  const dv = fields[2];
  const cnpj = `${root}${order}${dv}`;
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj)) throw new Error("Invalid canonical CNPJ");
  return {
    cnpj_root: root,
    cnpj_order: order,
    cnpj_dv: dv,
    cnpj_canonical: cnpj,
    branch_type: fields[3] === "1" ? "MATRIZ" : fields[3] === "2" ? "FILIAL" : "UNKNOWN",
    trade_name: nullable(fields[4]),
    registration_status_code: nullable(fields[5]),
    registration_status_date: decodeDate(fields[6]),
    registration_status_reason_code: nullable(fields[7]),
    foreign_city: nullable(fields[8]),
    country_code: nullable(fields[9]),
    activity_start_date: decodeDate(fields[10]),
    main_cnae_code: nullable(fields[11]),
    secondary_cnae_codes: fields[12].split(",").map((value) => value.trim()).filter(Boolean),
    state: nullable(fields[19]),
    municipality_code: nullable(fields[20]),
    source_record_hash: recordHash(fields),
  };
}

export function parsePartner(fields) {
  if (fields.length < 11 || !/^[A-Z0-9]{8}$/.test(fields[0].toUpperCase())) {
    throw new Error("Invalid partner row");
  }
  return {
    cnpj_root: fields[0].toUpperCase(),
    partner_identifier_type: nullable(fields[1]),
    partner_name: fields[2].trim(),
    partner_document_masked: nullable(fields[3]),
    partner_qualification_code: nullable(fields[4]),
    entry_date: decodeDate(fields[5]),
    country_code: nullable(fields[6]),
    legal_representative_document_masked: nullable(fields[7]),
    legal_representative_name: nullable(fields[8]),
    legal_representative_qualification_code: nullable(fields[9]),
    age_group: nullable(fields[10]),
    source_record_hash: recordHash(fields),
  };
}

export function parseSimples(fields) {
  if (fields.length < 7 || !/^[A-Z0-9]{8}$/.test(fields[0].toUpperCase())) {
    throw new Error("Invalid Simples/MEI row");
  }
  return {
    cnpj_root: fields[0].toUpperCase(),
    simples_option: yesNo(fields[1]),
    simples_option_start_date: decodeDate(fields[2]),
    simples_option_end_date: decodeDate(fields[3]),
    mei_option: yesNo(fields[4]),
    mei_option_start_date: decodeDate(fields[5]),
    mei_option_end_date: decodeDate(fields[6]),
    source_record_hash: recordHash(fields),
  };
}
