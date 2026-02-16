# AnkiBefore

Chrome MV3 extension. Anki 복습 카드 남아있으면 브라우저 차단.

## Architecture

- `background.js` — Service Worker. 30초 alarms로 AnkiConnect(localhost:8765) 폴링. declarativeNetRequest로 차단/해제. webNavigation으로 폴링 사이 탐색도 차단. 탭 원본 URL 저장/복원.
- `blocked.html/js/css` — 차단 페이지. storage.onChanged로 실시간 상태 반영. "Anki 열기"(Native Messaging), "바로 확인하기"(즉시 폴링) 버튼.
- `options.html/js/css` — 덱 선택 설정. AnkiConnect에서 덱 목록 fetch → 체크박스.
- `native/open_anki.sh` — Native Messaging Host. `open -a Anki` 실행. install_native.sh로 설치.

## Key Design

- **기본 차단, 확인 후 해제** — storage 상태가 "done"이 아니면 항상 차단.
- AnkiConnect API: `deckNames`, `getDeckStats`, `guiDeckBrowser`.
- 상태: `due` | `done` | `anki_not_running` | `no_decks` → `chrome.storage.local.ankiState`.
- 선택 덱: `chrome.storage.local.selectedDecks` (빈 배열이면 전체 덱).
- 차단 시 탭 URL을 `savedTabUrls`에 저장, 해제 시 복원.
