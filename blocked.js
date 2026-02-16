const POLL_INTERVAL = 30;

let countdownInterval = null;

function renderState(state) {
  const title = document.getElementById("title");
  const subtitle = document.getElementById("subtitle");
  const stats = document.getElementById("stats");
  const totalSection = document.getElementById("totalSection");
  const totalCount = document.getElementById("totalCount");
  const newCount = document.getElementById("newCount");
  const learnCount = document.getElementById("learnCount");
  const reviewCount = document.getElementById("reviewCount");
  const checkNow = document.getElementById("checkNow");

  if (!state) {
    title.textContent = "상태를 확인하는 중...";
    subtitle.textContent = "";
    stats.classList.add("hidden");
    totalSection.classList.add("hidden");
    checkNow.classList.add("hidden");
    return;
  }

  if (state.status === "anki_not_running") {
    title.textContent = "Anki를 실행하세요";
    subtitle.textContent = "Anki Desktop과 AnkiConnect가 실행 중이어야 합니다.";
    stats.classList.add("hidden");
    totalSection.classList.add("hidden");
    checkNow.classList.remove("hidden");
  } else if (state.status === "due") {
    title.textContent = "Anki 복습을 먼저 완료하세요";
    subtitle.textContent = "복습을 마치면 브라우저를 사용할 수 있습니다.";
    stats.classList.remove("hidden");
    totalSection.classList.remove("hidden");
    checkNow.classList.remove("hidden");
    newCount.textContent = state.newCount;
    learnCount.textContent = state.learnCount;
    reviewCount.textContent = state.reviewCount;
    totalCount.textContent = state.dueTotal;
  } else if (state.status === "done") {
    title.textContent = "복습 완료!";
    subtitle.textContent = "브라우저를 자유롭게 사용하세요.";
    stats.classList.add("hidden");
    totalSection.classList.add("hidden");
    checkNow.classList.add("hidden");
  } else {
    title.textContent = "상태를 확인하는 중...";
    subtitle.textContent = "";
    stats.classList.add("hidden");
    totalSection.classList.add("hidden");
    checkNow.classList.add("hidden");
  }

  updateLastCheck(state.lastCheck);
}

function updateLastCheck(timestamp) {
  const el = document.getElementById("lastCheck");
  if (!timestamp) {
    el.textContent = "";
    return;
  }
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  el.textContent = `마지막 확인: ${hours}:${minutes}:${seconds}`;
}

function startCountdown(lastCheck) {
  if (countdownInterval) clearInterval(countdownInterval);

  const countdownEl = document.getElementById("countdown");

  function tick() {
    if (!lastCheck) {
      countdownEl.textContent = "";
      return;
    }
    const elapsed = Math.floor((Date.now() - lastCheck) / 1000);
    const remaining = Math.max(0, POLL_INTERVAL - elapsed);
    countdownEl.textContent = `다음 확인까지 ${remaining}초`;
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

async function init() {
  const { ankiState } = await chrome.storage.local.get(["ankiState"]);
  renderState(ankiState);
  if (ankiState) startCountdown(ankiState.lastCheck);
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.ankiState) {
    const state = changes.ankiState.newValue;
    renderState(state);
    startCountdown(state?.lastCheck);
  }
});

document.getElementById("checkNow").addEventListener("click", async () => {
  const btn = document.getElementById("checkNow");
  btn.disabled = true;
  btn.textContent = "확인 중...";
  try {
    await chrome.runtime.sendMessage({ action: "checkNow" });
  } finally {
    btn.disabled = false;
    btn.textContent = "복습 확인하기";
  }
});

init();
