// SIE Study Blocker — blocked.js
// Renders SIE study cards on the block page. This is a blocker, not a
// gate: there is no pass and no way through to the site. Answer as many
// cards as you like, then close the tab and get back to work.

const els = {
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
  stats: { totalAnswered: 0, totalCorrect: 0, streak: 0 },
  recentIds: [],
};

// ---------- setup ----------

async function init() {
  const [questions, stored] = await Promise.all([
    fetch(chrome.runtime.getURL("questions.json")).then((r) => r.json()),
    chrome.storage.local.get([
      "totalAnswered",
      "totalCorrect",
      "streak",
      "recentIds",
    ]),
  ]);

  state.questions = questions;
  state.stats.totalAnswered = stored.totalAnswered || 0;
  state.stats.totalCorrect = stored.totalCorrect || 0;
  state.stats.streak = stored.streak || 0;
  state.recentIds = Array.isArray(stored.recentIds) ? stored.recentIds : [];

  renderStats();
  nextQuestion();
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
  els.submitBtn.hidden = false;
  els.submitBtn.disabled = true;
  els.nextBtn.hidden = true;
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
  els.nextBtn.hidden = false;
  els.kbdHint.hidden = false;

  chrome.storage.local.set({
    totalAnswered: state.stats.totalAnswered,
    totalCorrect: state.stats.totalCorrect,
    streak: state.stats.streak,
  });
  renderStats();
  els.nextBtn.focus();
  // The bigger card can push the action row below the fold on short
  // screens; make sure Next card is visible once the answer is shown.
  els.nextBtn.scrollIntoView({ block: "nearest" });
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

// ---------- wiring ----------

els.submitBtn.addEventListener("click", grade);
els.nextBtn.addEventListener("click", nextQuestion);

// Once the answer is shown, Enter or Space jumps to the next card.
// When the Next button itself is focused, let it handle the key natively
// (avoids firing the jump twice).
document.addEventListener("keydown", (e) => {
  if (!state.answered) return;
  if (e.key !== "Enter" && e.key !== " ") return;
  if (e.repeat) return;
  if (document.activeElement === els.nextBtn) return;
  e.preventDefault();
  nextQuestion();
});
els.optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
