#!/usr/bin/env node
// Rebuilds questions.json from the data/questions_part*.json files.
// Run after editing any part file:  node scripts/merge-questions.js

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dataDir = path.join(root, "data");

const KEY_ORDER = {
  multiple_choice: ["id", "section", "topic", "type", "question", "choices", "answer", "explanation"],
  type_in: ["id", "section", "topic", "type", "question", "answer", "accepted", "explanation"],
};

function serializeQuestion(q) {
  const lines = ["  {"];
  for (const key of KEY_ORDER[q.type]) {
    const val = q[key];
    const rendered = Array.isArray(val)
      ? "[" + val.map((v) => JSON.stringify(v)).join(", ") + "]"
      : JSON.stringify(val);
    lines.push(`    "${key}": ${rendered},`);
  }
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, "");
  lines.push("  }");
  return lines.join("\n");
}

function serializeBank(questions) {
  return "[\n" + questions.map(serializeQuestion).join(",\n") + "\n]\n";
}

function merge() {
  const parts = fs
    .readdirSync(dataDir)
    .filter((f) => /^questions_part\d+\.json$/.test(f))
    .sort();

  const merged = parts
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8")))
    .sort((a, b) => a.id - b.id);

  // Sanity checks: unique ids, well-formed questions.
  const ids = new Set();
  for (const q of merged) {
    if (ids.has(q.id)) throw new Error(`duplicate id ${q.id}`);
    ids.add(q.id);
    if (!KEY_ORDER[q.type]) throw new Error(`question ${q.id}: unknown type "${q.type}"`);
    if (q.type === "multiple_choice") {
      if (!Array.isArray(q.choices) || q.choices.length !== 4)
        throw new Error(`question ${q.id}: needs exactly 4 choices`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3)
        throw new Error(`question ${q.id}: answer must be a choice index 0-3`);
    } else {
      if (typeof q.answer !== "string" || !Array.isArray(q.accepted) || !q.accepted.length)
        throw new Error(`question ${q.id}: type_in needs a string answer and an accepted array`);
    }
    if (!q.explanation) throw new Error(`question ${q.id}: missing explanation`);
  }

  fs.writeFileSync(path.join(root, "questions.json"), serializeBank(merged));
  console.log(`merged ${merged.length} questions from ${parts.length} part files into questions.json`);
}

if (require.main === module) merge();

module.exports = { serializeBank, merge };
