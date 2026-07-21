// SIE Study Blocker — blocked.js
// Renders a random flashcard and unlocks the target site after the
// required number of correct answers.

const els = {
  tapeTrack: document.getElementById("tapeTrack"),
  progressLine: document.getElementById("progressLine"),
  qSection: document.getElementById("qSection"),
  qNumber: document.getElementById("qNumber"),
  qText: document.getElementById("qText"),
  answerArea: document.getElementById("answerArea"),
  feedback: document.getElementById("feedback"),
  verdict: document.getElementById("verdict"),
  explain: document.getElementById("explain"),
  submitBtn: document.getElementById("submitBtn"),
  nextBtn: document.getElementById("nextBtn"),
  continueBtn: document.getElementById("continueBtn"),
  stamp: document.getElementById("stamp"),
  kbdHint: document.getElementById("kbdHint"),
  sessionStat: document.getElementById("sessionStat"),
  streakStat: document.getElementById("streakStat"),
  allTimeStat: document.getElementById("allTimeStat"),
  optionsLink: document.getElementById("optionsLink"),
};

const state = {
  questions: [],
  current: null,
  selectedChoice: null,
  answered: false,
  sessionCorrect: 0,
  sessionAnswered: 0,
  settings: { passMinutes: 10, requiredCorrect: 1 },
  stats: { totalAnswered: 0, totalCorrect: 0, streak: 0 },
  recentIds: [],
  target: "https://x.com/",
};

// ---------- target validation (avoid open-redirect) ----------

const DEFAULT_SITES = ["x.com", "twitter.com"];

function safeTarget(blockedHosts) {
  const raw = new URLSearchParams(location.search).get("target");
  const fallback = "https://x.com/";
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    const ok =
      (url.protocol === "https:" || url.protocol === "http:") &&
      blockedHosts.some(
        (h) => url.hostname === h || url.hostname.endsWith("." + h)
      );
    return ok ? url.href : fallback;
  } catch {
    return fallback;
  }
}

// ---------- setup ----------

async function init() {
  const [questions, stored] = await Promise.all([
    fetch(chrome.runtime.getURL("questions.json")).then((r) => r.json()),
    chrome.storage.local.get([
      "passMinutes",
      "requiredCorrect",
      "totalAnswered",
      "totalCorrect",
      "streak",
      "recentIds",
      "blockedSites",
    ]),
  ]);

  const userSites = Array.isArray(stored.blockedSites)
    ? stored.blockedSites
    : [];
  state.target = safeTarget([...DEFAULT_SITES, ...userSites]);

  state.questions = questions;
  state.settings.passMinutes = clampInt(stored.passMinutes, 1, 120, 10);
  state.settings.requiredCorrect = clampInt(stored.requiredCorrect, 1, 5, 1);
  state.stats.totalAnswered = stored.totalAnswered || 0;
  state.stats.totalCorrect = stored.totalCorrect || 0;
  state.stats.streak = stored.streak || 0;
  state.recentIds = Array.isArray(stored.recentIds) ? stored.recentIds : [];

  buildTape();
  renderStats();
  updateProgressLine();
  nextQuestion();
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function buildTape() {
  const counts = {};
  for (const q of state.questions) {
    counts[q.section] = (counts[q.section] || 0) + 1;
  }
  const bits = Object.entries(counts).map(
    ([sec, n]) => `${sec.toUpperCase()} <b>${n} CARDS</b>`
  );
  bits.push(`BANK <b>${state.questions.length} QUESTIONS</b>`);
  bits.push(`PASS TARGET <b>70</b>`);
  bits.push(`EXAM <b>75 SCORED · 105 MIN</b>`);
  const line = bits.join(" &nbsp;·&nbsp; ") + " &nbsp;·&nbsp; ";
  // Doubled so the CSS loop is seamless.
  els.tapeTrack.innerHTML = line + line;
}

// ---------- question flow ----------

function pickQuestion() {
  const pool = state.questions.filter(
    (q) => !state.recentIds.includes(q.id)
  );
  const source = pool.length ? pool : state.questions;
  return source[Math.floor(Math.random() * source.length)];
}

function nextQuestion() {
  state.current = pickQuestion();
  state.selectedChoice = null;
  state.answered = false;

  // Remember the last 20 shown so cards don't repeat back-to-back.
  state.recentIds.push(state.current.id);
  if (state.recentIds.length > 20) state.recentIds.shift();
  chrome.storage.local.set({ recentIds: state.recentIds });

  const q = state.current;
  els.qSection.textContent = q.section + " · " + q.topic;
  els.qNumber.textContent = "Card " + q.id;
  els.qText.textContent = q.question;
  els.feedback.hidden = true;
  els.verdict.textContent = "";
  els.explain.textContent = "";
  els.stamp.classList.remove("show");
  els.submitBtn.hidden = false;
  els.submitBtn.disabled = true;
  els.nextBtn.hidden = true;
  els.continueBtn.hidden = true;
  els.kbdHint.hidden = true;
  els.answerArea.innerHTML = "";

  if (q.type === "multiple_choice") {
    q.choices.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.dataset.index = i;
      const letter = document.createElement("span");
      letter.className = "choice-letter";
      letter.textContent = String.fromCharCode(65 + i) + ".";
      const label = document.createElement("span");
      label.textContent = text;
      btn.append(letter, label);
      btn.addEventListener("click", () => {
        if (state.answered) return;
        state.selectedChoice = i;
        els.answerArea
          .querySelectorAll(".choice")
          .forEach((c) => c.classList.remove("selected"));
        btn.classList.add("selected");
        els.submitBtn.disabled = false;
      });
      els.answerArea.appendChild(btn);
    });
  } else {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "type-input";
    input.id = "typeInput";
    input.placeholder = "Write your answer on the line…";
    input.autocomplete = "off";
    input.addEventListener("input", () => {
      els.submitBtn.disabled = input.value.trim() === "";
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !els.submitBtn.disabled && !state.answered) {
        grade();
      }
    });
    els.answerArea.appendChild(input);
    input.focus();
  }
}

function normalize(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[$,%]/g, "")
    .replace(/\s+/g, " ");
}

function grade() {
  if (state.answered) return;
  const q = state.current;
  let correct = false;

  if (q.type === "multiple_choice") {
    if (state.selectedChoice === null) return;
    correct = state.selectedChoice === q.answer;
    els.answerArea.querySelectorAll(".choice").forEach((c) => {
      const i = parseInt(c.dataset.index, 10);
      c.disabled = true;
      if (i === q.answer) c.classList.add("correct");
      else if (i === state.selectedChoice && !correct) c.classList.add("wrong");
    });
  } else {
    const input = document.getElementById("typeInput");
    const given = normalize(input.value);
    const accepted = (q.accepted || [q.answer]).map(normalize);
    correct = accepted.includes(given);
    input.disabled = true;
  }

  state.answered = true;
  state.sessionAnswered += 1;
  state.stats.totalAnswered += 1;

  if (correct) {
    state.sessionCorrect += 1;
    state.stats.totalCorrect += 1;
    state.stats.streak += 1;
    els.verdict.textContent = "Correct";
    els.verdict.className = "feedback-verdict ok";
  } else {
    state.stats.streak = 0;
    const answerText =
      q.type === "multiple_choice"
        ? String.fromCharCode(65 + q.answer) + ". " + q.choices[q.answer]
        : q.answer;
    els.verdict.textContent = "Not quite — answer: " + answerText;
    els.verdict.className = "feedback-verdict bad";
  }

  els.explain.textContent = q.explanation;
  els.feedback.hidden = false;
  els.submitBtn.hidden = true;

  chrome.storage.local.set({
    totalAnswered: state.stats.totalAnswered,
    totalCorrect: state.stats.totalCorrect,
    streak: state.stats.streak,
  });
  renderStats();
  updateProgressLine();

  // Next card is always offered, so studying can continue past the unlock.
  // Once the pass is earned it stays earned for the session, even if a
  // later practice answer is wrong.
  const earned = state.sessionCorrect >= state.settings.requiredCorrect;
  els.nextBtn.hidden = false;
  els.kbdHint.hidden = false;
  if (earned) {
    els.continueBtn.hidden = false;
    if (correct) els.stamp.classList.add("show");
  }
  els.nextBtn.focus();
}

async function unlock() {
  const passUntil = Date.now() + state.settings.passMinutes * 60 * 1000;
  await chrome.storage.local.set({ passUntil });
  location.href = state.target;
}

// ---------- stats ----------

function renderStats() {
  els.sessionStat.textContent =
    state.sessionCorrect + " / " + state.sessionAnswered;
  els.streakStat.textContent = state.stats.streak;
  const pct = state.stats.totalAnswered
    ? Math.round((state.stats.totalCorrect / state.stats.totalAnswered) * 100)
    : 0;
  els.allTimeStat.textContent =
    pct + "% (" + state.stats.totalAnswered + " answered)";
}

function updateProgressLine() {
  const need = state.settings.requiredCorrect;
  const have = Math.min(state.sessionCorrect, need);
  els.progressLine.textContent =
    need === 1
      ? "Answer one card correctly to earn " +
        state.settings.passMinutes +
        " minutes on the site."
      : "Correct answers: " +
        have +
        " of " +
        need +
        " needed for a " +
        state.settings.passMinutes +
        "-minute pass.";
}

// ---------- wiring ----------

els.submitBtn.addEventListener("click", grade);
els.nextBtn.addEventListener("click", nextQuestion);
els.continueBtn.addEventListener("click", unlock);

// Once the answer is shown, Enter or Space jumps to the next card.
// Exception: if the Continue button was deliberately focused (tab), let
// Enter/Space keep their native meaning and activate it.
document.addEventListener("keydown", (e) => {
  if (!state.answered) return;
  if (e.key !== "Enter" && e.key !== " ") return;
  if (e.repeat) return;
  if (document.activeElement === els.continueBtn) return;
  e.preventDefault();
  nextQuestion();
});
els.optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
