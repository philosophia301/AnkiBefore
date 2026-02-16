# AnkiBefore

Anki 복습 카드가 남아있으면 브라우저 사용을 차단하는 Chrome Extension (MV3).

## 동작 방식

- 30초마다 AnkiConnect로 due 카드 수를 확인
- 카드가 남아있으면 모든 웹페이지를 차단 페이지로 redirect
- 복습 완료 시 원래 탭으로 자동 복원
- 기본 차단 → 확인 후 해제 방식 (빈틈 없음)

## 설치

1. `chrome://extensions` → 개발자 모드 활성화
2. "압축해제된 확장 프로그램을 로드합니다" → 이 폴더 선택

## 요구사항

- [Anki Desktop](https://apps.ankiweb.net/)
- [AnkiConnect](https://ankiweb.net/shared/info/2055492159) 애드온 (Anki 내 설치)
- Chrome 브라우저

## 파일 구조

```
├── manifest.json          # MV3 확장 설정
├── background.js          # Service Worker (폴링, 차단 규칙)
├── blocked.html/js/css    # 차단 페이지
├── options.html/js/css    # 설정 페이지 (덱 선택)
└── icons/                 # 확장 아이콘
```
