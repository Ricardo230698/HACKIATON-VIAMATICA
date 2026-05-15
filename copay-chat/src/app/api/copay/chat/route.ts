import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSystemPrompt } from "@/lib/systemPrompt";
import { parseSignal } from "@/lib/parseSignals";
import { lookupSymptomVec } from "@/lib/pineconeSearch";
import { lookupPolicy } from "@/lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callLLM(msgs: { role: string; content: string }[]) {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      { role: "system", content: getSystemPrompt() },
      ...(msgs as OpenAI.ChatCompletionMessageParam[]),
    ],
  });
  return response.choices[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 }
      );
    }

    const raw = await callLLM(messages);
    const signal = parseSignal(raw);

    // ── SYMPTOM_IDENTIFIED ──────────────────────────────────────────────────
    if (signal.type === "SYMPTOM_IDENTIFIED") {
      console.log(
        `[Chat] SYMPTOM_IDENTIFIED — looking up: "${signal.data.symptomDescription.slice(0, 60)}"`
      );

      const matches = await lookupSymptomVec(signal.data.symptomDescription);

      if (matches.length > 0) {
        // Deduplicate by symptom+specialty (show unique medical services)
        const seen = new Set<string>();
        const uniqueMatches = matches.filter((m) => {
          const key = `${m.symptom}|${m.specialty}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const matchLines = uniqueMatches
          .slice(0, 5)
          .map(
            (m, i) =>
              `${i + 1}. ${m.specialty} — ${m.service_name} (síntoma: "${m.symptom}")`
          )
          .join("\n");

        const injectionText = `[SYMPTOM_MATCHES]\nThe following medical services were found for the patient's symptoms. Present the best match to the user and confirm the specialty.\n\n${matchLines}`;

        const updatedMsgs = [
          ...messages,
          {
            role: "assistant",
            content: signal.displayText || raw.replace(/SYMPTOM_IDENTIFIED[\s\S]*$/, "").trim(),
          },
          { role: "user", content: injectionText },
        ];
        const raw2 = await callLLM(updatedMsgs);

        // Strip any leaked signals from the follow-up
        const cleanReply = raw2
          .replace(/SYMPTOM_IDENTIFIED\s*:?\s*\{[\s\S]*?\}/g, "")
          .replace(/POLICY_LOOKUP\s*:?\s*\{[\s\S]*?\}/g, "")
          .replace(/COPAY_READY\s*:?\s*\{[\s\S]*?\}/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        return NextResponse.json({ content: cleanReply });
      }

      // Fallback: no matches
      console.warn("[Chat] SYMPTOM_IDENTIFIED but no Pinecone matches found");
      const fallbackText =
        signal.displayText ||
        "I understand your symptoms. Let me also get your policy number to provide accurate copay estimates.";
      return NextResponse.json({ content: fallbackText });
    }

    // ── POLICY_LOOKUP ─────────────────────────────────────────────────────────
    if (signal.type === "POLICY_LOOKUP") {
      console.log(
        `[Chat] POLICY_LOOKUP — searching for: "${signal.data.policyNumber}"`
      );

      const policy = await lookupPolicy(signal.data.policyNumber);

      let injectionText: string;
      if (policy) {
        injectionText = `[POLICY_FOUND]\nPolicy: ${policy.policy_number}\nPatient: ${policy.patient_name}\nPlan: ${policy.insurance_plan}\nCoverage: ${policy.coverage_percentage}%\n\nConfirm the plan details to the patient. If you already have the symptom information from a previous [SYMPTOM_MATCHES] message, emit COPAY_READY with both the symptomDescription and policyNumber.`;
      } else {
        injectionText = `[POLICY_NOT_FOUND]\nThe policy number "${signal.data.policyNumber}" was not found in the system. Ask the user to verify their policy number. Valid format is POL-XXXX (e.g., POL-1001 through POL-1010).`;
      }

      const updatedMsgs = [
        ...messages,
        {
          role: "assistant",
          content: signal.displayText || raw.replace(/POLICY_LOOKUP[\s\S]*$/, "").trim(),
        },
        { role: "user", content: injectionText },
      ];
      const raw2 = await callLLM(updatedMsgs);

      // Check if Claude emitted COPAY_READY in the follow-up
      const signal2 = parseSignal(raw2);

      if (signal2.type === "COPAY_READY") {
        // Process copay calculation inline
        return await handleCopayReady(signal2, updatedMsgs, raw2);
      }

      const cleanReply = raw2
        .replace(/POLICY_LOOKUP\s*:?\s*\{[\s\S]*?\}/g, "")
        .replace(/COPAY_READY\s*:?\s*\{[\s\S]*?\}/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      return NextResponse.json({ content: cleanReply });
    }

    // ── COPAY_READY ───────────────────────────────────────────────────────────
    if (signal.type === "COPAY_READY") {
      return await handleCopayReady(signal, messages, raw);
    }

    // ── HANDOFF_REQUESTED ─────────────────────────────────────────────────────
    if (signal.type === "HANDOFF_REQUESTED") {
      return NextResponse.json({
        content: signal.displayText,
        handoff: true,
      });
    }

    // ── Normal response ───────────────────────────────────────────────────────
    return NextResponse.json({ content: signal.displayText || raw });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Chat] Error:", errMsg);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 500 }
    );
  }
}

/**
 * Handle COPAY_READY signal: look up policy + search Pinecone with plan filter → return copay results.
 */
async function handleCopayReady(
  signal: { type: "COPAY_READY"; data: { symptomDescription: string; policyNumber: string }; displayText: string },
  messages: { role: string; content: string }[],
  raw: string
) {
  console.log(
    `[Chat] COPAY_READY — symptom="${signal.data.symptomDescription.slice(0, 40)}" policy="${signal.data.policyNumber}"`
  );

  const policy = await lookupPolicy(signal.data.policyNumber);
  if (!policy) {
    return NextResponse.json({
      content: "I couldn't find that policy. Please verify your policy number.",
    });
  }

  // Search Pinecone with plan filter for accurate copay data
  const matches = await lookupSymptomVec(
    signal.data.symptomDescription,
    policy.insurance_plan
  );

  if (matches.length === 0) {
    return NextResponse.json({
      content:
        "I couldn't find matching medical services for your symptoms. Please try describing your symptoms differently.",
    });
  }

  // Deduplicate by hospital (keep best match per hospital)
  const byHospital = new Map<string, typeof matches[0]>();
  for (const m of matches) {
    if (
      !byHospital.has(m.hospital_name) ||
      byHospital.get(m.hospital_name)!.score < m.score
    ) {
      byHospital.set(m.hospital_name, m);
    }
  }
  const hospitalResults = Array.from(byHospital.values()).sort(
    (a, b) => a.estimated_copay - b.estimated_copay
  );

  // Build results injection for LLM
  const resultLines = hospitalResults
    .map(
      (m, i) =>
        `${i + 1}. ${m.hospital_name}: copago estimado $${m.estimated_copay.toFixed(2)} (precio final: $${m.final_price.toFixed(2)}, cobertura: ${m.coverage_percentage}%, especialidad: ${m.specialty}, servicio: ${m.service_name})`
    )
    .join("\n");

  const injectionText = `[COPAY_RESULTS]\nPatient: ${policy.patient_name}\nPlan: ${policy.insurance_plan} (${policy.coverage_percentage}% coverage)\n\nHospital options (sorted by lowest copay):\n${resultLines}\n\nPresent these results clearly to the patient. Highlight the most affordable option. Explain briefly how copay is calculated.`;

  const updatedMsgs = [
    ...messages,
    {
      role: "assistant",
      content: signal.displayText || raw.replace(/COPAY_READY[\s\S]*$/, "").trim(),
    },
    { role: "user", content: injectionText },
  ];

  const raw2 = await callLLM(updatedMsgs);
  const cleanReply = raw2
    .replace(/COPAY_READY\s*:?\s*\{[\s\S]*?\}/g, "")
    .replace(/SYMPTOM_IDENTIFIED\s*:?\s*\{[\s\S]*?\}/g, "")
    .replace(/POLICY_LOOKUP\s*:?\s*\{[\s\S]*?\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Return both the LLM text AND the structured data for the ResultPanel
  return NextResponse.json({
    content: cleanReply,
    copayResults: {
      policy: {
        policyNumber: policy.policy_number,
        patientName: policy.patient_name,
        plan: policy.insurance_plan,
        coveragePercentage: policy.coverage_percentage,
      },
      hospitals: hospitalResults.map((m) => ({
        hospitalName: m.hospital_name,
        specialty: m.specialty,
        serviceName: m.service_name,
        baseCost: m.base_cost,
        multiplier: m.service_price_multiplier,
        finalPrice: m.final_price,
        coveragePercentage: m.coverage_percentage,
        estimatedCopay: m.estimated_copay,
      })),
    },
  });
}
