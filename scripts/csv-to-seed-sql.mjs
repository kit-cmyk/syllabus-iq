#!/usr/bin/env node
/**
 * Convert a question CSV (import-questions.mjs format) into idempotent seed SQL
 * for pasting into the Supabase dashboard — the fallback when the service role
 * key is unavailable locally. Skips stems that already exist, so running the
 * SQL twice (or after the CSV importer) inserts no duplicates.
 *
 * Usage:
 *   node scripts/csv-to-seed-sql.mjs content/far-batch-001.csv   # writes content/far-batch-001.sql
 */
import { readFileSync, writeFileSync } from "node:fs";

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }
  return rows;
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/csv-to-seed-sql.mjs <questions.csv>");
  process.exit(1);
}

const rows = parseCSV(readFileSync(file, "utf8"));
const header = rows.shift().map((h) => h.trim().toLowerCase());
const col = Object.fromEntries(header.map((h, i) => [h, i]));
const LETTER_INDEX = { A: 0, B: 1, C: 2, D: 3 };
const q = (s) => `'${s.replace(/'/g, "''")}'`;

const values = rows.map((r) => {
  const get = (c) => (r[col[c]] ?? "").trim();
  const correct = LETTER_INDEX[get("correct").toUpperCase()];
  const difficulty = get("difficulty") ? Number(get("difficulty")) : 2;
  return `  (${q(get("subject_code").toUpperCase())}, ${q(get("topic"))},\n   ${q(get("stem"))},\n   ${q(get("choice_a"))}, ${q(get("choice_b"))}, ${q(get("choice_c"))}, ${q(get("choice_d"))},\n   ${correct}, ${q(get("explanation"))}, ${difficulty})`;
});

const sql = `-- Generated from ${file} by scripts/csv-to-seed-sql.mjs — do not edit by hand.
-- Idempotent: skips any question whose stem already exists.
with t as (
  select tp.id, tp.name, s.code from public.topics tp
  join public.subjects s on s.id = tp.subject_id
),
q(subject_code, topic, stem, a, b, c, d, correct_index, explanation, difficulty) as (values
${values.join(",\n")}
)
insert into public.questions (topic_id, stem, choices, correct_index, explanation, difficulty)
select t.id, q.stem, jsonb_build_array(q.a, q.b, q.c, q.d), q.correct_index, q.explanation, q.difficulty
from q join t on t.code = q.subject_code and lower(t.name) = lower(q.topic)
where not exists (select 1 from public.questions x where x.stem = q.stem);
`;

const out = file.replace(/\.csv$/i, ".sql");
writeFileSync(out, sql);
console.log(`✓ ${out} (${rows.length} questions)`);
