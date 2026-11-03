#!/bin/zsh
# peek.sh <slug-or-path-under-web/src/app/(admin)> [skeleton|script]  — compact read of a generated skeleton / original script
cd "$(dirname "$0")/.."
case "${2:-skeleton}" in
  skeleton) sed -E 's/^ +//; s/ style=\{\{[^}]*\}\}//g' "web/src/app/(admin)/$1/Body.tsx" | grep -vE '^\s*$|^<I\.I|^<path' | cut -c1-${3:-190} ;;
  script) grep -vE '^\s*(//|$)|<path|stroke-|fill=|d="|viewBox' "tools/out/$1/script.js" | sed -E 's/^ +//' | cut -c1-${3:-170} ;;
esac
