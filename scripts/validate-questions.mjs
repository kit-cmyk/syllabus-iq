#!/usr/bin/env node
/**
 * Offline question-CSV validator — same rules as import-questions.mjs, no DB needed.
 * Topics are parsed from supabase/seed/0001_syllabus.sql so the check stays in sync.
 *
 * Usage:
 *   node scripts/validate-questions.mjs content/far-batch-001.csv [more.csv ...]
 *
 * Also reports per-topic counts, difficulty mix, correct-letter distribution,
 * and duplicate stems across all files passed in one run.
 */
import { readFileSync } from "node:fs";

// --- minimal CSV parser (same as import-questions.mjs) ---
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

// --- load valid SUBJECT::topic keys from the syllabus seed ---
const seed = readFileSync("supabase/seed/0001_syllabus.sql", "utf8");
const topicKeys = new Set();
for (const m of seed.matchAll(/\('([A-Z]+)',\s*'((?:[^']|'')+)',\s*\d+,\s*\d+\)/g)) {
  topicKeys.add(`${m[1]}::${m[2].replace(/''/g, "'").toLowerCase()}`);
}
if (!topicKeys.size) {
  console.error("Could not parse topics from supabase/seed/0001_syllabus.sql");
  process.exit(1);
}

const COLUMNS = [
  "subject_code", "topic", "stem", "choice_a", "choice_b", "choice_c",
  "choice_d", "correct", "explanation", "difficulty",
];

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node scripts/validate-questions.mjs <questions.csv> [...]");
  process.exit(1);
}

let totalErrors = 0;
const stems = new Map(); // stem -> first "file:line" seen, for cross-file dupe check

for (const file of files) {
  const rows = parseCSV(readFileSync(file, "utf8"));
  const header = rows.shift()?.map((h) => h.trim().toLowerCase());
  const errors = [];
  if (!header || COLUMNS.slice(0, 9).some((c) => !header.includes(c))) {
    errors.push(`header must include: ${COLUMNS.slice(0, 9).join(",")}`);
  }
  const col = Object.fromEntries((header ?? []).map((h, i) => [h, i]));
  const perTopic = {};
  const perDiff = {};
  const perLetter = {};

  rows.forEach((r, i) => {
    const line = i + 2;
    const get = (c) => (r[col[c]] ?? "").trim();
    const subjectCode = get("subject_code").toUpperCase();
    const topic = get("topic");
    if (!topicKeys.has(`${subjectCode}::${topic.toLowerCase()}`))
      errors.push(`row ${line}: unknown topic "${topic}" in ${subjectCode}`);
    const choices = ["choice_a", "choice_b", "choice_c", "choice_d"].map(get);
    if (choices.some((c) => !c)) errors.push(`row ${line}: all 4 choices are required`);
    if (!["A", "B", "C", "D"].includes(get("correct").toUpperCase()))
      errors.push(`row ${line}: correct must be A, B, C, or D`);
    const stem = get("stem");
    if (!stem) errors.push(`row ${line}: stem is required`);
    if (!get("explanation")) errors.push(`row ${line}: explanation is required`);
    const difficulty = get("difficulty") ? Number(get("difficulty")) : 2;
    if (![1, 2, 3].includes(difficulty)) errors.push(`row ${line}: difficulty must be 1-3`);
    const where = `${file}:${line}`;
    if (stems.has(stem)) errors.push(`row ${line}: duplicate stem (first seen at ${stems.get(stem)})`);
    else stems.set(stem, where);
    perTopic[topic] = (perTopic[topic] || 0) + 1;
    perDiff[difficulty] = (perDiff[difficulty] || 0) + 1;
    const letter = get("correct").toUpperCase();
    perLetter[letter] = (perLetter[letter] || 0) + 1;
  });

  console.log(`\n${file}: ${rows.length} rows, ${Object.keys(perTopic).length} topics`);
  for (const [t, n] of Object.entries(perTopic)) console.log(`  ${n}  ${t}`);
  console.log(`  difficulty: ${JSON.stringify(perDiff)}  letters: ${JSON.stringify(perLetter)}`);
  if (errors.length) {
    console.error(`✗ ${errors.length} error(s):\n` + errors.map((e) => `  ${e}`).join("\n"));
    totalErrors += errors.length;
  } else {
    console.log("✓ valid");
  }
}

process.exit(totalErrors ? 1 : 0);
