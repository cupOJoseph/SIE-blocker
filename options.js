// SIE Study Blocker — options page logic

const DEFAULTS = { passMinutes: 10, requiredCorrect: 1 };

// Always blocked; user-added sites are stored separately in blockedSites.
const DEFAULT_SITES = ["x.com", "twitter.com"];

const passInput = document.getElementById("passMinutes");
const reqInput = document.getElementById("requiredCorrect");
const saveBtn = document.getElementById("saveBtn");
const savedTag = document.getElementById("saved");
const resetBtn = document.getElementById("resetBtn");
const siteList = document.getElementById("siteList");
const siteInput = document.getElementById("siteInput");
const addSiteBtn = document.getElementById("addSiteBtn");
const siteMsg = document.getElementById("siteMsg");

function clamp(n, lo, hi, fallback) {
  n = parseInt(n, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

async function load() {
  const cfg = await chrome.storage.local.get({ ...DEFAULTS, blockedSites: [] });
  passInput.value = clamp(cfg.passMinutes, 1, 120, DEFAULTS.passMinutes);
  reqInput.value = clamp(cfg.requiredCorrect, 1, 5, DEFAULTS.requiredCorrect);
  renderSites(Array.isArray(cfg.blockedSites) ? cfg.blockedSites : []);
}

async function save() {
  const passMinutes = clamp(passInput.value, 1, 120, DEFAULTS.passMinutes);
  const requiredCorrect = clamp(reqInput.value, 1, 5, DEFAULTS.requiredCorrect);
  passInput.value = passMinutes;
  reqInput.value = requiredCorrect;
  await chrome.storage.local.set({ passMinutes, requiredCorrect });
  savedTag.classList.add("show");
  setTimeout(() => savedTag.classList.remove("show"), 1800);
}

// ---------- blocked sites (add-only) ----------

function renderSites(userSites) {
  siteList.innerHTML = "";
  for (const host of DEFAULT_SITES) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = host;
    const tag = document.createElement("span");
    tag.className = "site-tag";
    tag.textContent = "built-in";
    li.append(name, tag);
    siteList.appendChild(li);
  }
  for (const host of userSites) {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = host;
    li.appendChild(name);
    siteList.appendChild(li);
  }
}

// "https://www.old.Reddit.com/r/all" -> "old.reddit.com" (leading www. dropped)
function normalizeSite(raw) {
  let s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = "https://" + s;
  let hostname;
  try {
    hostname = new URL(s).hostname;
  } catch {
    return null;
  }
  hostname = hostname.replace(/^www\./, "");
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(hostname)) return null;
  return hostname;
}

function showSiteMsg(text, kind) {
  siteMsg.textContent = text;
  siteMsg.className = kind;
}

async function addSite() {
  const host = normalizeSite(siteInput.value);
  if (!host) {
    showSiteMsg("Enter a valid domain, like reddit.com.", "err");
    return;
  }

  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  const sites = Array.isArray(blockedSites) ? blockedSites : [];
  const all = [...DEFAULT_SITES, ...sites];
  const covered = all.find((h) => host === h || host.endsWith("." + h));
  if (covered) {
    showSiteMsg(
      covered === host
        ? host + " is already blocked."
        : host + " is already covered by " + covered + ".",
      "err"
    );
    return;
  }

  sites.push(host);
  await chrome.storage.local.set({ blockedSites: sites });
  renderSites(sites);
  siteInput.value = "";
  showSiteMsg(host + " is now blocked. No take-backs.", "ok");
}

async function resetStats() {
  await chrome.storage.local.set({
    totalAnswered: 0,
    totalCorrect: 0,
    streak: 0,
    recentIds: [],
  });
  resetBtn.textContent = "Stats cleared";
  setTimeout(() => (resetBtn.textContent = "Reset all-time stats"), 1800);
}

saveBtn.addEventListener("click", save);
resetBtn.addEventListener("click", resetStats);
addSiteBtn.addEventListener("click", addSite);
siteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});
load();
