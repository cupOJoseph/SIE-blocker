// SIE Study Blocker — blocked.js
// Renders SIE study cards on the block page. Get UNLOCK_CORRECT right and
// the blocked sites open for a while (the background worker holds that
// unlock in memory). Nothing on this page is saved: stats, streak and the
// recently shown cards live only as long as the tab does.

const els = {
  progressLine: document.getElementById("progressLine"),
  unlockPanel: document.getElementById("unlockPanel"),
  unlockPips: document.getElementById("unlockPips"),
  unlockLabel: document.getElementById("unlockLabel"),
  unlockedPanel: document.getElementById("unlockedPanel"),
  unlockedText: document.getElementById("unlockedText"),
  goBtn: document.getElementById("goBtn"),
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
  optionsLink: document.getElementById("optionsLink"),
};

const state = {
  questions: [],
  current: null,
  order: [], // display position -> original choice index
  selectedChoice: null, // original choice index
  answered: false,
  sessionCorrect: 0,
  sessionAnswered: 0,
  streak: 0,
  recentIds: [],
  required: 5,
  minutes: 30,
  unlockProgress: 0, // correct answers toward the next unlock
  unlockedUntil: 0,
  returnUrl: "https://x.com/",
};

// ---------- setup ----------

// Where the user was headed before being blocked; only web URLs.
function readReturnUrl() {
  const from = new URLSearchParams(location.search).get("from");
  try {
    const url = new URL(from);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {}
  return "https://x.com/";
}

async function init() {
  state.returnUrl = readReturnUrl();
  const [questions, unlock] = await Promise.all([
    fetch(chrome.runtime.getURL("questions.json")).then((r) => r.json()),
    chrome.runtime.sendMessage({ type: "getUnlock" }),
  ]);

  state.questions = questions;
  state.required = unlock.required;
  state.minutes = unlock.minutes;
  state.unlockedUntil = unlock.unlockedUntil;

  renderUnlock();
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

function shuffledIndexes(n) {
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function nextQuestion() {
  state.current = pickQuestion();
  state.selectedChoice = null;
  state.answered = false;

  // Remember the last 50 shown so cards don't repeat back-to-back.
  state.recentIds.push(state.current.id);
  if (state.recentIds.length > 50) state.recentIds.shift();

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
    // Shuffle so the right answer isn't always in the same slot.
    state.order = shuffledIndexes(q.choices.length);
    state.order.forEach((original, pos) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice";
      btn.dataset.index = original;
      const letter = document.createElement("span");
      letter.className = "choice-letter";
      letter.textContent = String.fromCharCode(65 + pos) + ".";
      const label = document.createElement("span");
      label.textContent = q.choices[original];
      btn.append(letter, label);
      btn.addEventListener("click", () => {
        if (state.answered) return;
        state.selectedChoice = original;
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

  if (correct) {
    state.sessionCorrect += 1;
    state.unlockProgress += 1;
    state.streak += 1;
    els.verdict.textContent = "Correct";
    els.verdict.className = "feedback-verdict ok";
  } else {
    state.streak = 0;
    const answerText =
      q.type === "multiple_choice"
        ? String.fromCharCode(65 + state.order.indexOf(q.answer)) +
          ". " +
          q.choices[q.answer]
        : q.answer;
    els.verdict.textContent = "Not quite — answer: " + answerText;
    els.verdict.className = "feedback-verdict bad";
  }

  els.explain.textContent = q.explanation;
  els.feedback.hidden = false;
  els.submitBtn.hidden = true;
  els.nextBtn.hidden = false;
  els.kbdHint.hidden = false;

  renderStats();
  if (correct) maybeUnlock();
  els.nextBtn.focus();
  // The bigger card can push the action row below the fold on short
  // screens; make sure Next card is visible once the answer is shown.
  els.nextBtn.scrollIntoView({ block: "nearest" });
}

// ---------- unlock ----------

function isUnlocked() {
  return state.unlockedUntil > Date.now();
}

function returnHost() {
  return new URL(state.returnUrl).hostname.replace(/^www\./, "");
}

async function maybeUnlock() {
  if (isUnlocked() || state.unlockProgress < state.required) {
    renderUnlock();
    return;
  }
  const { unlockedUntil } = await chrome.runtime.sendMessage({
    type: "unlock",
  });
  state.unlockedUntil = unlockedUntil;
  renderUnlock();
}

function renderUnlock() {
  const host = returnHost();
  if (isUnlocked()) {
    const until = new Date(state.unlockedUntil).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    els.unlockPanel.hidden = true;
    els.unlockedPanel.hidden = false;
    els.unlockedText.textContent = "Unlocked until " + until + ".";
    els.goBtn.textContent = "Go to " + host;
    els.progressLine.textContent =
      "Nice work. Keep studying, or take your break.";
    return;
  }

  els.unlockPanel.hidden = false;
  els.unlockedPanel.hidden = true;
  const got = Math.min(state.unlockProgress, state.required);
  els.unlockPips.innerHTML = "";
  for (let i = 0; i < state.required; i++) {
    const pip = document.createElement("span");
    pip.className = "pip" + (i < got ? " on" : "");
    els.unlockPips.appendChild(pip);
  }
  els.unlockLabel.textContent = got + " / " + state.required + " correct";
  els.progressLine.textContent =
    "Get " + state.required + " right to open " + host + " for " + state.minutes + " minutes.";
}

async function goToSite() {
  // The unlock may have run out while this page sat open.
  const { unlockedUntil } = await chrome.runtime.sendMessage({
    type: "getUnlock",
  });
  state.unlockedUntil = unlockedUntil;
  if (!isUnlocked()) {
    state.unlockProgress = 0;
    renderUnlock();
    return;
  }
  location.href = state.returnUrl;
}

// ---------- stats (this tab only) ----------

function renderStats() {
  els.sessionStat.textContent =
    state.sessionCorrect + " / " + state.sessionAnswered;
  els.streakStat.textContent = state.streak;
}

// ---------- wiring ----------

els.submitBtn.addEventListener("click", grade);
els.nextBtn.addEventListener("click", nextQuestion);
els.goBtn.addEventListener("click", goToSite);

// Once the answer is shown, Enter or Space jumps to the next card.
// When a button itself is focused, let it handle the key natively
// (avoids firing twice).
document.addEventListener("keydown", (e) => {
  if (!state.answered) return;
  if (e.key !== "Enter" && e.key !== " ") return;
  if (e.repeat) return;
  if (document.activeElement && document.activeElement.tagName === "BUTTON")
    return;
  e.preventDefault();
  nextQuestion();
});
els.optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
