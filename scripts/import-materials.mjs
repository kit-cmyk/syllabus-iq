#!/usr/bin/env node
/**
 * Study-materials importer — same pattern as import-questions.mjs.
 *
 * Usage:
 *   node scripts/import-materials.mjs path/to/materials.csv
 *
 * Required env (read from .env.local automatically):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * CSV columns (header row required):
 *   subject_code,topic,type,title,body,video_url,duration_minutes,sort_order
 *   - type: reading | video
 *   - body: markdown, required for readings (quote it; embedded newlines are fine)
 *   - video_url: required for videos (YouTube/Vimeo)
 *
 * Validates every row; imports nothing if any row fails.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
  console.error("Usage: node scripts/import-materials.mjs <materials.csv>");
  process.exit(1);
}

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

const REQUIRED = ["subject_code", "topic", "type", "title"];

const rows = parseCSV(readFileSync(file, "utf8"));
const header = rows.shift()?.map((h) => h.trim().toLowerCase());
if (!header || REQUIRED.some((c) => !header.includes(c))) {
  console.error(
    "Header must include: subject_code,topic,type,title (plus body / video_url / duration_minutes / sort_order)"
  );
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
  const line = i + 2;
  const get = (c) => (col[c] === undefined ? "" : (r[col[c]] ?? "").trim());
  const subjectCode = get("subject_code").toUpperCase();
  const tid = topicId.get(`${subjectCode}::${get("topic").toLowerCase()}`);
  if (!tid) errors.push(`row ${line}: unknown topic "${get("topic")}" in ${subjectCode}`);
  const type = get("type").toLowerCase();
  if (!["reading", "video"].includes(type))
    errors.push(`row ${line}: type must be reading or video`);
  if (!get("title")) errors.push(`row ${line}: title is required`);
  if (type === "reading" && !get("body"))
    errors.push(`row ${line}: readings need a markdown body`);
  if (type === "video" && !get("video_url"))
    errors.push(`row ${line}: videos need a video_url`);
  inserts.push({
    topic_id: tid,
    type,
    title: get("title"),
    body: get("body") || null,
    video_url: get("video_url") || null,
    duration_minutes: get("duration_minutes") ? Number(get("duration_minutes")) : null,
    sort_order: get("sort_order") ? Number(get("sort_order")) : 1,
  });
});

if (errors.length) {
  console.error(`✗ ${errors.length} error(s) — nothing imported:\n` + errors.join("\n"));
  process.exit(1);
}

const { error } = await supabase.from("materials").insert(inserts);
if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}
console.log(`✓ Imported ${inserts.length} materials from ${file}`);
