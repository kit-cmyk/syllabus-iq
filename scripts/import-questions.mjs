#!/usr/bin/env node
/**
 * CSV question importer (PLAN.md Phase 1) — the only content pipeline at launch.
 *
 * Usage:
 *   node scripts/import-questions.mjs path/to/questions.csv
 *
 * Required env (read from .env.local automatically):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * CSV columns (header row required):
 *   subject_code,topic,stem,choice_a,choice_b,choice_c,choice_d,correct,explanation,difficulty
 *   - correct: A | B | C | D
 *   - difficulty: 1 | 2 | 3 (optional, defaults 2)
 *
 * Validates every row; prints row-level errors and imports nothing if any row fails.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- load .env.local ---
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/import-questions.mjs <questions.csv>");
  process.exit(1);
}

// --- minimal CSV parser (handles quoted fields, embedded commas/newlines) ---
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

const COLUMNS = [
  "subject_code", "topic", "stem", "choice_a", "choice_b", "choice_c",
  "choice_d", "correct", "explanation", "difficulty",
];
const LETTER_INDEX = { A: 0, B: 1, C: 2, D: 3 };

const rows = parseCSV(readFileSync(file, "utf8"));
const header = rows.shift()?.map((h) => h.trim().toLowerCase());
if (!header || COLUMNS.slice(0, 9).some((c) => !header.includes(c))) {
  console.error(`Header must include: ${COLUMNS.slice(0, 9).join(",")}`);
  process.exit(1);
}
const col = Object.fromEntries(header.map((h, i) => [h, i]));

const supabase = createClient(url, key);
const { data: topics, error: topicErr } = await supabase
  .from("topics")
  .select("id, name, subjects:subject_id(code)");
if (topicErr) {
  console.error("Could not load topics:", topicErr.message);
  process.exit(1);
}
const topicId = new Map(
  topics.map((t) => [`${t.subjects.code}::${t.name.toLowerCase()}`, t.id])
);

const errors = [];
const inserts = [];
rows.forEach((r, i) => {
  const line = i + 2; // 1-based + header
  const get = (c) => (r[col[c]] ?? "").trim();
  const subjectCode = get("subject_code").toUpperCase();
  const topicKey = `${subjectCode}::${get("topic").toLowerCase()}`;
  const tid = topicId.get(topicKey);
  if (!tid) errors.push(`row ${line}: unknown topic "${get("topic")}" in ${subjectCode}`);
  const choices = ["choice_a", "choice_b", "choice_c", "choice_d"].map(get);
  if (choices.some((c) => !c)) errors.push(`row ${line}: all 4 choices are required`);
  const correct = LETTER_INDEX[get("correct").toUpperCase()];
  if (correct === undefined) errors.push(`row ${line}: correct must be A, B, C, or D`);
  if (!get("stem")) errors.push(`row ${line}: stem is required`);
  if (!get("explanation")) errors.push(`row ${line}: explanation is required (it's the teaching moment)`);
  const difficulty = get("difficulty") ? Number(get("difficulty")) : 2;
  if (![1, 2, 3].includes(difficulty)) errors.push(`row ${line}: difficulty must be 1-3`);
  inserts.push({
    topic_id: tid,
    stem: get("stem"),
    choices,
    correct_index: correct,
    explanation: get("explanation"),
    difficulty,
  });
});

if (errors.length) {
  console.error(`✗ ${errors.length} error(s) — nothing imported:\n` + errors.join("\n"));
  process.exit(1);
}

const { error } = await supabase.from("questions").insert(inserts);
if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}
console.log(`✓ Imported ${inserts.length} questions from ${file}`);
