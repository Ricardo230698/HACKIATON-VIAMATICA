import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

async function init() {
  const dbPath = path.join(process.cwd(), 'data', 'policies.db');
  
  // Create or open DB
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS policies (
      policy_number TEXT PRIMARY KEY,
      patient_name TEXT NOT NULL,
      insurance_plan TEXT NOT NULL,
      coverage_percentage INTEGER NOT NULL
    )
  `);

  // Clear existing
  await db.exec('DELETE FROM policies');

  // Load JSON
  const jsonPath = path.join(process.cwd(), 'data', 'policies.json');
  const policies = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Insert
  const stmt = await db.prepare('INSERT INTO policies (policy_number, patient_name, insurance_plan, coverage_percentage) VALUES (?, ?, ?, ?)');
  for (const p of policies) {
    await stmt.run(p.policy_number, p.patient_name, p.insurance_plan, p.coverage_percentage);
  }
  await stmt.finalize();

  console.log(`Successfully imported ${policies.length} policies into ${dbPath}`);
  await db.close();
}

init().catch(console.error);
