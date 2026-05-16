export type Signal =
  | { type: "SYMPTOM_IDENTIFIED"; data: { symptomDescription: string }; displayText: string }
  | { type: "POLICY_LOOKUP"; data: { policyNumber: string }; displayText: string }
  | { type: "COPAY_READY"; data: { symptomDescription: string; policyNumber: string }; displayText: string }
  | { type: "HANDOFF_REQUESTED"; displayText: string }
  | { type: "NONE"; displayText: string };

/**
 * Strip markdown code fences from a string.
 */
function stripCodeFences(str: string): string {
  let cleaned = str.replace(/^```[\w]*\s*\n?/gm, "");
  cleaned = cleaned.replace(/\n?```\s*$/gm, "");
  return cleaned.trim();
}

/**
 * Try to extract JSON from a string that may contain markdown formatting.
 */
function extractJSON(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str.trim());
  } catch {
    // ignore
  }

  try {
    return JSON.parse(stripCodeFences(str));
  } catch {
    // ignore
  }

  const firstBrace = str.indexOf("{");
  const lastBrace = str.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(str.slice(firstBrace, lastBrace + 1));
    } catch {
      // ignore
    }
  }

  return null;
}

export function parseSignal(raw: string): Signal {
  // ── 1. COPAY_READY ──────────────────────────────────────────────────────────
  const copayPattern = /COPAY_READY\s*:?\s*/;
  const copayMatch = raw.match(copayPattern);

  if (copayMatch && copayMatch.index !== undefined) {
    const displayText = raw.slice(0, copayMatch.index).trim();
    const afterMarker = raw.slice(copayMatch.index + copayMatch[0].length).trim();
    const data = extractJSON(afterMarker);

    if (data) {
      return {
        type: "COPAY_READY",
        data: {
          symptomDescription: (data.symptomDescription as string) || "",
          policyNumber: (data.policyNumber as string) || "",
        },
        displayText,
      };
    }
  }

  // ── 2. SYMPTOM_IDENTIFIED ───────────────────────────────────────────────────
  const symptomPattern = /SYMPTOM_IDENTIFIED\s*:?\s*/;
  const symptomMatch = raw.match(symptomPattern);

  if (symptomMatch && symptomMatch.index !== undefined) {
    const displayText = raw.slice(0, symptomMatch.index).trim();
    const afterMarker = raw.slice(symptomMatch.index + symptomMatch[0].length).trim();
    const data = extractJSON(afterMarker);

    if (data && typeof data.symptomDescription === "string") {
      return {
        type: "SYMPTOM_IDENTIFIED",
        data: { symptomDescription: data.symptomDescription as string },
        displayText,
      };
    }
  }

  // ── 3. POLICY_LOOKUP ────────────────────────────────────────────────────────
  const policyPattern = /POLICY_LOOKUP\s*:?\s*/;
  const policyMatch = raw.match(policyPattern);

  if (policyMatch && policyMatch.index !== undefined) {
    const displayText = raw.slice(0, policyMatch.index).trim();
    const afterMarker = raw.slice(policyMatch.index + policyMatch[0].length).trim();
    const data = extractJSON(afterMarker);

    if (data && typeof data.policyNumber === "string") {
      return {
        type: "POLICY_LOOKUP",
        data: { policyNumber: data.policyNumber as string },
        displayText,
      };
    }
  }

  // ── 4. HANDOFF_REQUESTED ────────────────────────────────────────────────────
  if (raw.includes("HANDOFF_REQUESTED")) {
    const displayText = raw.replace(/HANDOFF_REQUESTED/g, "").trim();
    return { type: "HANDOFF_REQUESTED", displayText };
  }

  // ── 5. Normal message ───────────────────────────────────────────────────────
  return { type: "NONE", displayText: raw };
}
