#!/bin/bash
# AnkiBefore Native Messaging Host 설치 스크립트
# 사용법: ./install_native.sh

set -e

HOST_NAME="com.ankibefore.open_anki"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_SCRIPT="$SCRIPT_DIR/native/open_anki.sh"
TARGET_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"

echo "AnkiBefore Native Messaging Host 설치"
echo "======================================"
echo ""

# Extension ID 입력
echo "Chrome에서 AnkiBefore extension ID를 입력하세요."
echo "(chrome://extensions 에서 확인 가능)"
echo ""
read -p "Extension ID: " EXT_ID

if [ -z "$EXT_ID" ]; then
  echo "Error: Extension ID가 필요합니다."
  exit 1
fi

# 디렉토리 생성
mkdir -p "$TARGET_DIR"

# Native Messaging Host manifest 생성
cat > "$TARGET_DIR/$HOST_NAME.json" <<EOF
{
  "name": "$HOST_NAME",
  "description": "Opens Anki desktop application",
  "path": "$HOST_SCRIPT",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF

echo ""
echo "설치 완료!"
echo "  Host manifest: $TARGET_DIR/$HOST_NAME.json"
echo "  Host script:   $HOST_SCRIPT"
echo ""
echo "Chrome을 재시작한 후 사용하세요."
