#!/bin/bash
# Chrome Native Messaging host for opening Anki
# Reads a message from stdin (Chrome protocol), opens Anki, sends response

# Read message length (4 bytes, little-endian)
read_message() {
  local length
  length=$(dd bs=4 count=1 2>/dev/null | od -A n -t u4 | tr -d ' ')
  if [ -z "$length" ] || [ "$length" -eq 0 ]; then
    exit 0
  fi
  dd bs="$length" count=1 2>/dev/null
}

# Write message with 4-byte length prefix
send_message() {
  local message="$1"
  local length=${#message}
  printf "$(printf '\\x%02x\\x%02x\\x%02x\\x%02x' \
    $((length & 0xFF)) \
    $(((length >> 8) & 0xFF)) \
    $(((length >> 16) & 0xFF)) \
    $(((length >> 24) & 0xFF)))"
  printf '%s' "$message"
}

message=$(read_message)
open -a Anki
send_message '{"ok":true}'
