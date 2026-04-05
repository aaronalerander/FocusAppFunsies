#!/bin/bash
PROJ=$(pwd)
cleanup() {
  pkill -f "$PROJ/node_modules/electron" 2>/dev/null
  exit
}
trap cleanup INT TERM EXIT
electron_config_cache=.electron-cache vite
