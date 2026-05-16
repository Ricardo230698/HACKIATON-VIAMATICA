import path from "path";
import fs from "fs";
import initSqlJs, { Database } from "sql.js";

export interface Policy {
  policy_number: string;
  patient_name: string;
  insurance_plan: string;
  coverage_percentage: number;
}

// Global cached db instance for the Next.js serverless/dev environment
let dbInstance: Database | null = null;

async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  const dbPath = path.join(process.cwd(), "data", "policies.db");
  const fileBuffer = fs.readFileSync(dbPath);
  dbInstance = new SQL.Database(fileBuffer);
  return dbInstance;
}

/**
 * Look up a policy by exact policy number match (case-insensitive).
 */
export async function lookupPolicy(policyNumber: string): Promise<Policy | null> {
  try {
    const db = await getDb();
    const normalized = policyNumber.trim().toUpperCase();

    const result = db.exec(
      "SELECT * FROM policies WHERE UPPER(policy_number) = ?",
      [normalized]
    );

    if (result.length > 0 && result[0].values.length > 0) {
      const cols = result[0].columns;
      const row = result[0].values[0];
      const found = Object.fromEntries(cols.map((c, i) => [c, row[i]])) as unknown as Policy;
      console.log(`[DB] Policy found in SQLite: ${found.policy_number} → ${found.insurance_plan} (${found.coverage_percentage}%)`);
      return found;
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
    const result = db.exec("SELECT * FROM policies");
    if (result.length === 0) return [];
    const cols = result[0].columns;
    return result[0].values.map(
      (row) => Object.fromEntries(cols.map((c, i) => [c, row[i]])) as unknown as Policy
    );
  } catch (error) {
    console.error("[DB] Error listing policies:", error);
    return [];
  }
}
