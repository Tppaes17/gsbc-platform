export const MAX_AI_CONTEXT_TEXT_LENGTH = 600;

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /ignore\s+(as\s+)?instruções?\s+(anteriores|acima)/gi,
  /system\s+prompt/gi,
  /developer\s+message/gi,
  /reveal\s+(the\s+)?prompt/gi,
  /execute\s+without\s+(approval|confirmation)/gi,
  /execute\s+sem\s+(aprovação|confirmacao|confirmação)/gi,
];

export interface SanitizedAiText {
  text: string;
  wasTruncated: boolean;
  flaggedPatterns: string[];
}

export function sanitizeAiContextText(value: string | null | undefined): SanitizedAiText {
  const original = (value ?? "").replace(/\s+/g, " ").trim();
  const flaggedPatterns = INJECTION_PATTERNS
    .filter((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(original);
    })
    .map((pattern) => pattern.source);

  let text = original;
  for (const pattern of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, "[conteúdo instrucional removido]");
  }

  const wasTruncated = text.length > MAX_AI_CONTEXT_TEXT_LENGTH;
  if (wasTruncated) {
    text = `${text.slice(0, MAX_AI_CONTEXT_TEXT_LENGTH)} [truncado]`;
  }

  return { text, wasTruncated, flaggedPatterns };
}

export function summarizeAiContextSafety(fields: Record<string, string | null | undefined>) {
  const sanitizedEntries = Object.entries(fields).map(([field, value]) => {
    const sanitized = sanitizeAiContextText(value);
    return [field, sanitized] as const;
  });

  return {
    flagged_fields: sanitizedEntries
      .filter(([, sanitized]) => sanitized.flaggedPatterns.length > 0)
      .map(([field]) => field),
    truncated_fields: sanitizedEntries
      .filter(([, sanitized]) => sanitized.wasTruncated)
      .map(([field]) => field),
  };
}
