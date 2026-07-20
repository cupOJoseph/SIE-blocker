// SIE Study Gate — background service worker (Manifest V3)
// Intercepts navigation to blocked sites and redirects to the
// flashcard page unless the user has recently earned a study pass.

const DEFAULT_SITES = ["x.com", "twitter.com"];

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

async function hasActivePass() {
  const { passUntil = 0 } = await chrome.storage.local.get("passUntil");
  return Date.now() < passUntil;
}

async function maybeBlock(details) {
  // Only top-level frames.
  if (details.frameId !== 0) return;
  await hostsReady;
  if (!isBlockedUrl(details.url)) return;
  if (await hasActivePass()) return;

  const gateUrl =
    chrome.runtime.getURL("blocked.html") +
    "?target=" +
    encodeURIComponent(details.url);

  try {
    await chrome.tabs.update(details.tabId, { url: gateUrl });
  } catch {
    // Tab may have closed; nothing to do.
  }
}

// No URL filters: the blocklist is dynamic, so filter inside the handler.
// Full navigations (address bar, links from other sites, new tabs).
chrome.webNavigation.onBeforeNavigate.addListener(maybeBlock);

// Many blocked sites are single-page apps: catch in-site route changes
// after a pass expires.
chrome.webNavigation.onHistoryStateUpdated.addListener(maybeBlock);

// Sensible defaults on install.
chrome.runtime.onInstalled.addListener(async () => {
  const defaults = { passMinutes: 10, requiredCorrect: 1, blockedSites: [] };
  const current = await chrome.storage.local.get(Object.keys(defaults));
  const toSet = {};
  for (const [k, v] of Object.entries(defaults)) {
    if (current[k] === undefined) toSet[k] = v;
  }
  if (Object.keys(toSet).length) await chrome.storage.local.set(toSet);
});
