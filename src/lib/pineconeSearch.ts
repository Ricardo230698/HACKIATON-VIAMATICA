import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

export type SymptomMatch = {
  symptom: string;
  specialty: string;
  service_name: string;
  base_cost: number;
  insurance_plan: string;
  coverage_percentage: number;
  hospital_name: string;
  service_price_multiplier: number;
  final_price: number;
  estimated_copay: number;
  score: number;
};

// Module-level singletons to avoid cold-start re-init per request
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const pineconeIndex = pc.index(process.env.PINECONE_INDEX_NAME!);

/**
 * Semantic search for symptoms in Pinecone.
 * Optionally filter by insurance_plan to get plan-specific copay data.
 */
export async function lookupSymptomVec(
  symptomDescription: string,
  insurancePlan?: string
): Promise<SymptomMatch[]> {
  // ── Step 1: Generate embedding via OpenAI ──────────────────────────────────
  let vector: number[];
  try {
    const embResp = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: symptomDescription,
      dimensions: 1024,
    });
    vector = embResp.data[0].embedding;
  } catch (err) {
    console.error("[PineconeSearch] OpenAI embedding failed:", {
      error: err instanceof Error ? err.message : err,
      symptomDescription: symptomDescription.slice(0, 80),
    });
    return [];
  }

  // ── Step 2: Query Pinecone ────────────────────────────────────────────────
  let queryResp;
  try {
    const queryOptions: {
      vector: number[];
      topK: number;
      includeMetadata: boolean;
      filter?: Record<string, unknown>;
    } = {
      vector,
      topK: 30,
      includeMetadata: true,
    };

    // If we know the insurance plan, filter by it
    if (insurancePlan) {
      queryOptions.filter = { insurance_plan: { $eq: insurancePlan } };
    }

    queryResp = await pineconeIndex.query(queryOptions);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[PineconeSearch] Pinecone query failed:", {
      error: errMsg,
      indexName: process.env.PINECONE_INDEX_NAME,
    });
    return [];
  }

  // ── Step 3: Process matches ───────────────────────────────────────────────
  const rawMatchCount = queryResp.matches?.length ?? 0;
  if (rawMatchCount === 0) {
    console.warn("[PineconeSearch] Pinecone returned 0 matches for:", {
      symptomDescription: symptomDescription.slice(0, 80),
      insurancePlan,
    });
    return [];
  }

  const results: SymptomMatch[] = [];

  for (const match of queryResp.matches ?? []) {
    const meta = match.metadata as Record<string, unknown>;
    if (!meta) continue;

    results.push({
      symptom: meta.symptom as string,
      specialty: meta.specialty as string,
      service_name: meta.service_name as string,
      base_cost: meta.base_cost as number,
      insurance_plan: meta.insurance_plan as string,
      coverage_percentage: meta.coverage_percentage as number,
      hospital_name: meta.hospital_name as string,
      service_price_multiplier: meta.service_price_multiplier as number,
      final_price: meta.final_price as number,
      estimated_copay: meta.estimated_copay as number,
      score: match.score ?? 0,
    });
  }

  // Sort by estimated copay ascending (best deal first)
  results.sort((a, b) => a.estimated_copay - b.estimated_copay);

  console.log(
    `[PineconeSearch] Found ${results.length} symptom matches (from ${rawMatchCount} raw) for: "${symptomDescription.slice(0, 60)}"${insurancePlan ? ` plan=${insurancePlan}` : ""}`
  );

  return results;
}
