// SIE Study Blocker — background service worker (Manifest V3)
// Redirects navigation to blocked sites to the study page. Answering
// UNLOCK_CORRECT questions correctly on that page opens blocked sites for
// UNLOCK_MINUTES. The unlock lives in chrome.storage.session, which is held
// in memory only: it is never written to disk and is gone when Chrome closes.

const DEFAULT_SITES = ["x.com", "twitter.com"];
const UNLOCK_CORRECT = 5;
const UNLOCK_MINUTES = 30;
const RELOCK_ALARM = "relock";

// Stats from older versions that were saved to disk. Deleted on update so
// nothing about the user's study history stays on the machine.
const LEGACY_KEYS = ["totalAnswered", "totalCorrect", "streak", "recentIds"];

// Kept in sync with storage; user-added sites are add-only (see options page).
let blockedHosts = [...DEFAULT_SITES];

async function loadBlockedHosts() {
  const { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
  blockedHosts = [...new Set([...DEFAULT_SITES, ...blockedSites])];
}

const hostsReady = loadBlockedHosts();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.blockedSites) loadBlockedHosts();
});

function isBlockedHost(hostname) {
  return blockedHosts.some(
    (h) => hostname === h || hostname.endsWith("." + h)
  );
}

function isBlockedUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return isBlockedHost(url.hostname);
  } catch {
    return false;
  }
}

// ---------- unlock (memory only) ----------

async function getUnlockedUntil() {
  const { unlockedUntil = 0 } = await chrome.storage.session.get(
    "unlockedUntil"
  );
  return unlockedUntil;
}

async function isUnlocked() {
  return (await getUnlockedUntil()) > Date.now();
}

async function unlock() {
  const unlockedUntil = Date.now() + UNLOCK_MINUTES * 60 * 1000;
  await chrome.storage.session.set({ unlockedUntil });
  await chrome.alarms.create(RELOCK_ALARM, { when: unlockedUntil });
  return unlockedUntil;
}

// When the unlock runs out, send any tab still sitting on a blocked site
// back to the study page, so a long scroll session can't outlast it.
async function relock() {
  await chrome.storage.session.remove("unlockedUntil");
  await hostsReady;
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      const frames = await chrome.webNavigation.getAllFrames({
        tabId: tab.id,
      });
      const top = frames && frames.find((f) => f.frameId === 0);
      if (top && isBlockedUrl(top.url)) await sendToStudyPage(tab.id, top.url);
    } catch {
      // Tab closed or not inspectable; skip it.
    }
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RELOCK_ALARM) relock();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "getUnlock") {
    getUnlockedUntil().then((unlockedUntil) =>
      sendResponse({
        unlockedUntil,
        required: UNLOCK_CORRECT,
        minutes: UNLOCK_MINUTES,
      })
    );
    return true;
  }
  if (msg && msg.type === "unlock") {
    unlock().then((unlockedUntil) => sendResponse({ unlockedUntil }));
    return true;
  }
});

// ---------- blocking ----------

async function sendToStudyPage(tabId, fromUrl) {
  const studyUrl =
    chrome.runtime.getURL("blocked.html") +
    "?from=" +
    encodeURIComponent(fromUrl);
  try {
    await chrome.tabs.update(tabId, { url: studyUrl });
  } catch {
    // Tab may have closed; nothing to do.
  }
}

async function maybeBlock(details) {
  // Only top-level frames.
  if (details.frameId !== 0) return;
  await hostsReady;
  if (!isBlockedUrl(details.url)) return;
  if (await isUnlocked()) return;
  await sendToStudyPage(details.tabId, details.url);
}

// No URL filters: the blocklist is dynamic, so filter inside the handler.
// Full navigations (address bar, links from other sites, new tabs).
chrome.webNavigation.onBeforeNavigate.addListener(maybeBlock);

// Many blocked sites are single-page apps: catch in-site route changes.
chrome.webNavigation.onHistoryStateUpdated.addListener(maybeBlock);

// Sensible defaults on install; clear stats older versions saved to disk.
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.remove(LEGACY_KEYS);
  const { blockedSites } = await chrome.storage.local.get("blockedSites");
  if (blockedSites === undefined) {
    await chrome.storage.local.set({ blockedSites: [] });
  }
});
