const ANKI_CONNECT_URL = "http://127.0.0.1:8765";
const ALARM_NAME = "checkAnki";
const RULE_ID = 1;

async function ankiConnectRequest(action, params = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(ANKI_CONNECT_URL, {
      method: "POST",
      body: JSON.stringify({ action, version: 6, params }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function checkAnki() {
  const stored = await chrome.storage.local.get(["selectedDecks"]);
  const selectedDecks = stored.selectedDecks || [];

  try {
    const allDecks = await ankiConnectRequest("deckNames");

    const decksToCheck =
      selectedDecks.length > 0
        ? selectedDecks.filter((d) => allDecks.includes(d))
        : allDecks;

    if (decksToCheck.length === 0) {
      await saveState({
        status: "no_decks",
        dueTotal: 0,
        newCount: 0,
        learnCount: 0,
        reviewCount: 0,
        lastCheck: Date.now(),
      });
      await setBlocking(false);
      updateBadge("no_decks", 0);
      return;
    }

    const stats = await ankiConnectRequest("getDeckStats", {
      decks: decksToCheck,
    });

    let newCount = 0;
    let learnCount = 0;
    let reviewCount = 0;

    for (const deckId of Object.keys(stats)) {
      const s = stats[deckId];
      newCount += s.new_count;
      learnCount += s.learn_count;
      reviewCount += s.review_count;
    }

    const dueTotal = newCount + learnCount + reviewCount;

    await saveState({
      status: dueTotal > 0 ? "due" : "done",
      dueTotal,
      newCount,
      learnCount,
      reviewCount,
      lastCheck: Date.now(),
    });

    if (dueTotal > 0) {
      await setBlocking(true);
      updateBadge("due", dueTotal);
    } else {
      await setBlocking(false);
      updateBadge("done", 0);
    }
  } catch (err) {
    await saveState({
      status: "anki_not_running",
      dueTotal: 0,
      newCount: 0,
      learnCount: 0,
      reviewCount: 0,
      lastCheck: Date.now(),
    });
    await setBlocking(true);
    updateBadge("anki_not_running", 0);
  }
}

async function saveState(state) {
  await chrome.storage.local.set({ ankiState: state });
}

function updateBadge(status, dueTotal) {
  if (status === "due") {
    chrome.action.setBadgeText({ text: String(dueTotal) });
    chrome.action.setBadgeBackgroundColor({ color: "#e53935" });
  } else if (status === "done") {
    chrome.action.setBadgeText({ text: "\u2713" });
    chrome.action.setBadgeBackgroundColor({ color: "#43a047" });
  } else if (status === "anki_not_running") {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#fbc02d" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

async function setBlocking(enable) {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map((r) => r.id);

  if (enable) {
    const extensionOrigin = chrome.runtime.getURL("");
    const redirectUrl = chrome.runtime.getURL("blocked.html");

    const rules = [
      {
        id: RULE_ID,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { url: redirectUrl },
        },
        condition: {
          resourceTypes: ["main_frame"],
          excludedRequestDomains: ["localhost", "127.0.0.1"],
          excludedInitiatorDomains: ["localhost", "127.0.0.1"],
        },
      },
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: rules,
    });

    redirectExistingTabs(redirectUrl);
  } else {
    if (existingIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingIds,
      });
    }
    await restoreTabs();
  }
}

// tabId -> originalUrl 매핑 (메모리)
const savedUrls = new Map();

async function redirectExistingTabs(redirectUrl) {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (
      tab.url &&
      !tab.url.startsWith("chrome://") &&
      !tab.url.startsWith("chrome-extension://") &&
      !tab.url.startsWith("about:") &&
      !tab.url.includes("localhost:8765") &&
      !tab.url.includes("127.0.0.1:8765")
    ) {
      savedUrls.set(tab.id, tab.url);
      chrome.tabs.update(tab.id, { url: redirectUrl });
    }
  }

  // 디스크에도 저장 (서비스 워커 재시작 대비)
  await chrome.storage.local.set({
    savedTabUrls: Object.fromEntries(savedUrls),
  });
}

async function restoreTabs() {
  // 메모리에 없으면 디스크에서 복원
  if (savedUrls.size === 0) {
    const { savedTabUrls } = await chrome.storage.local.get(["savedTabUrls"]);
    if (savedTabUrls) {
      for (const [id, url] of Object.entries(savedTabUrls)) {
        savedUrls.set(Number(id), url);
      }
    }
  }

  if (savedUrls.size === 0) return;

  const blockedUrl = chrome.runtime.getURL("blocked.html");
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.url && tab.url.startsWith(blockedUrl)) {
      const originalUrl = savedUrls.get(tab.id);
      if (originalUrl) {
        chrome.tabs.update(tab.id, { url: originalUrl });
      }
    }
  }

  savedUrls.clear();
  await chrome.storage.local.remove("savedTabUrls");
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkAnki();
  }
});

async function initialize() {
  // 저장된 상태를 먼저 확인해서 즉시 차단 여부 결정 (기본: 차단)
  const { ankiState } = await chrome.storage.local.get(["ankiState"]);
  if (!ankiState || ankiState.status !== "done") {
    await setBlocking(true);
    if (ankiState) {
      updateBadge(ankiState.status, ankiState.dueTotal);
    }
  }

  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 });
  checkAnki();
}

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkNow") {
    checkAnki().then(() => sendResponse({ ok: true }));
    return true;
  }
});

// 탭 닫히면 저장된 URL 정리
chrome.tabs.onRemoved.addListener((tabId) => {
  savedUrls.delete(tabId);
});

// 페이지 이동 시 저장된 상태 기반으로 즉시 차단
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const url = details.url;
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.includes("localhost:8765") ||
    url.includes("127.0.0.1:8765")
  ) {
    return;
  }

  const { ankiState } = await chrome.storage.local.get(["ankiState"]);
  if (!ankiState || ankiState.status !== "done") {
    if (!savedUrls.has(details.tabId)) {
      savedUrls.set(details.tabId, url);
      chrome.storage.local.set({
        savedTabUrls: Object.fromEntries(savedUrls),
      });
    }
    const redirectUrl = chrome.runtime.getURL("blocked.html");
    chrome.tabs.update(details.tabId, { url: redirectUrl });
  }
});
