#!/bin/bash
# SessionStart: le sessioni cloud partono da un container nuovo, quindi
# reinstalla la CLI graphify (usata dalla skill /graphify e dagli hook PreToolUse).
set -uo pipefail

GRAPHIFY_VERSION="0.9.93"

if command -v graphify >/dev/null 2>&1 \
  && pip show graphifyy 2>/dev/null | grep -q "^Version: ${GRAPHIFY_VERSION}$"; then
  exit 0
fi

pip install --quiet --disable-pip-version-check "graphifyy==${GRAPHIFY_VERSION}" >/dev/null 2>&1 \
  || echo "graphify: installazione non riuscita (pip install graphifyy==${GRAPHIFY_VERSION})" >&2
exit 0
