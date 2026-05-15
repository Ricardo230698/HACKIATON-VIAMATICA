import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

export interface Policy {
  policy_number: string;
  patient_name: string;
  insurance_plan: string;
  coverage_percentage: number;
}

// Global cached db connection for the Next.js serverless/dev environment
let dbPromise: Promise<any> | null = null;

function getDb() {
  if (!dbPromise) {
    const dbPath = path.join(process.cwd(), "data", "policies.db");
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
  }
  return dbPromise;
}

/**
 * Look up a policy by exact policy number match (case-insensitive).
 */
export async function lookupPolicy(policyNumber: string): Promise<Policy | null> {
  try {
    const db = await getDb();
    const normalized = policyNumber.trim().toUpperCase();
    
    // SQLite query using parameterized input to prevent SQL injection
    const found = await db.get(
      "SELECT * FROM policies WHERE UPPER(policy_number) = ?",
      normalized
    );

    if (found) {
      console.log(`[DB] Policy found in SQLite: ${found.policy_number} → ${found.insurance_plan} (${found.coverage_percentage}%)`);
      return found as Policy;
    } else {
      console.warn(`[DB] Policy not found in SQLite: "${policyNumber}"`);
      return null;
    }
  } catch (error) {
    console.error("[DB] Error looking up policy:", error);
    return null;
  }
}

/**
 * List all available policies (for debugging).
 */
export async function listPolicies(): Promise<Policy[]> {
  try {
    const db = await getDb();
    return await db.all("SELECT * FROM policies") as Policy[];
  } catch (error) {
    console.error("[DB] Error listing policies:", error);
    return [];
  }
}
