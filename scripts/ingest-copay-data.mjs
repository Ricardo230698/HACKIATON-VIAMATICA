/**
 * One-time ingestion script:
 * 1. Creates the Pinecone index if it doesn't exist
 * 2. Reads copay_estimator_data.json
 * 3. Embeds each record via OpenAI
 * 4. Upserts vectors to Pinecone with full metadata
 *
 * Run from copay-chat/:
 *   node scripts/ingest-copay-data.mjs
 *
 * Requires in .env.local: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local manually ──────────────────────────────────────────────────
const envPath = resolve(__dirname, "../.env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const { Pinecone } = await import("@pinecone-database/pinecone");
const OpenAI = (await import("openai")).default;

const BATCH_SIZE = 50;
const MODEL = "text-embedding-3-large";
const DIMENSIONS = 1024;
const INDEX_NAME = process.env.PINECONE_INDEX_NAME;

if (!INDEX_NAME) throw new Error("PINECONE_INDEX_NAME not set");
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY not set");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// ── Step 1: Create index if it doesn't exist ──────────────────────────────────
console.log(`\n🔍 Checking if index "${INDEX_NAME}" exists...`);
const existingIndexes = await pc.listIndexes();
const indexNames = existingIndexes.indexes?.map((idx) => idx.name) || [];

if (indexNames.includes(INDEX_NAME)) {
  console.log(`✅ Index "${INDEX_NAME}" already exists.`);
} else {
  console.log(`🆕 Creating index "${INDEX_NAME}" (1024 dims, cosine)...`);
  await pc.createIndex({
    name: INDEX_NAME,
    dimension: DIMENSIONS,
    metric: "cosine",
    spec: {
      serverless: {
        cloud: "aws",
        region: "us-east-1",
      },
    },
  });

  // Wait for index to be ready
  console.log("⏳ Waiting for index to initialize...");
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const desc = await pc.describeIndex(INDEX_NAME);
      if (desc.status?.ready) {
        ready = true;
        break;
      }
      process.stdout.write(".");
    } catch {
      process.stdout.write(".");
    }
  }
  if (!ready) {
    throw new Error("Index did not become ready within 3 minutes");
  }
  console.log("\n✅ Index is ready!");
}

const index = pc.index(INDEX_NAME);

// ── Step 2: Load data ─────────────────────────────────────────────────────────
const dataPath = resolve(__dirname, "../data/copay_estimator_data.json");
const records = JSON.parse(readFileSync(dataPath, "utf8"));
console.log(`\n📊 Loaded ${records.length} records from copay_estimator_data.json`);

// ── Step 3: Embed and upsert ──────────────────────────────────────────────────
let upserted = 0;

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  if (batch.length === 0) break;

  // Build embedding text: symptom + specialty + service for maximum semantic richness
  const inputs = batch.map(
    (r) => `${r.symptom} | ${r.specialty} | ${r.service_name}`
  );

  const embResp = await openai.embeddings.create({
    model: MODEL,
    input: inputs,
    dimensions: DIMENSIONS,
  });

  if (i === 0) {
    console.log(
      `   First batch: ${embResp.data.length} embeddings for ${batch.length} records`
    );
  }

  const vectors = batch.map((r, j) => {
    // Create a unique ID per record: symptom_plan_hospital (slugified)
    const slug = (s) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñ]+/g, "_")
        .replace(/^_|_$/g, "");
    const id = `${slug(r.symptom)}_${slug(r.insurance_plan)}_${slug(r.hospital_name)}`;

    return {
      id,
      values: embResp.data[j].embedding,
      metadata: {
        symptom: r.symptom,
        specialty: r.specialty,
        service_name: r.service_name,
        base_cost: r.base_cost,
        insurance_plan: r.insurance_plan,
        coverage_percentage: r.coverage_percentage,
        hospital_name: r.hospital_name,
        service_price_multiplier: r.service_price_multiplier,
        final_price: r.final_price,
        estimated_copay: r.estimated_copay,
      },
    };
  });

  await index.upsert({ records: vectors });
  upserted += batch.length;
  console.log(`   ✅ Upserted ${upserted}/${records.length}`);
}

console.log(`\n🎉 Ingestion complete! ${upserted} vectors in Pinecone index "${INDEX_NAME}".`);
console.log(
  "   You can now run `npm run dev` and start chatting.\n"
);
