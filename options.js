const ANKI_CONNECT_URL = "http://127.0.0.1:8765";

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

function setConnectionStatus(connected) {
  const badge = document.getElementById("connectionStatus");
  const message = document.getElementById("connectionMessage");

  if (connected) {
    badge.textContent = "연결됨";
    badge.className = "status-badge connected";
    message.textContent = "";
  } else {
    badge.textContent = "연결 안 됨";
    badge.className = "status-badge disconnected";
    message.textContent =
      "Anki Desktop을 실행하고 AnkiConnect 애드온이 설치되어 있는지 확인하세요.";
  }
}

async function loadDecks() {
  const deckList = document.getElementById("deckList");
  const deckControls = document.getElementById("deckControls");

  try {
    const decks = await ankiConnectRequest("deckNames");
    setConnectionStatus(true);

    const { selectedDecks } = await chrome.storage.local.get(["selectedDecks"]);
    const selected = selectedDecks || [];

    deckList.innerHTML = "";
    deckControls.classList.remove("hidden");

    decks.sort();

    for (const deck of decks) {
      const item = document.createElement("div");
      item.className = "deck-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `deck-${deck}`;
      checkbox.value = deck;
      checkbox.checked = selected.includes(deck);
      checkbox.addEventListener("change", saveSelection);

      const label = document.createElement("label");
      label.htmlFor = `deck-${deck}`;
      label.textContent = deck;

      item.appendChild(checkbox);
      item.appendChild(label);
      deckList.appendChild(item);
    }

    updateToggleAll();
  } catch (err) {
    setConnectionStatus(false);
    deckList.innerHTML =
      '<p class="placeholder">AnkiConnect에 연결할 수 없습니다.</p>';
    deckControls.classList.add("hidden");
  }
}

async function saveSelection() {
  const checkboxes = document.querySelectorAll('.deck-item input[type="checkbox"]');
  const selected = [];
  for (const cb of checkboxes) {
    if (cb.checked) selected.push(cb.value);
  }
  await chrome.storage.local.set({ selectedDecks: selected });
  updateToggleAll();
  showSaveNotice();
}

function updateToggleAll() {
  const checkboxes = document.querySelectorAll('.deck-item input[type="checkbox"]');
  const toggleAll = document.getElementById("toggleAll");
  if (checkboxes.length === 0) return;
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  const someChecked = Array.from(checkboxes).some((cb) => cb.checked);
  toggleAll.checked = allChecked;
  toggleAll.indeterminate = someChecked && !allChecked;
}

function showSaveNotice() {
  const notice = document.getElementById("saveNotice");
  notice.classList.remove("hidden");
  setTimeout(() => notice.classList.add("hidden"), 1500);
}

document.getElementById("toggleAll").addEventListener("change", (e) => {
  const checkboxes = document.querySelectorAll('.deck-item input[type="checkbox"]');
  for (const cb of checkboxes) {
    cb.checked = e.target.checked;
  }
  saveSelection();
});

document.getElementById("refreshBtn").addEventListener("click", loadDecks);

loadDecks();
