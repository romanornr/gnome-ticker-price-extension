#!/usr/bin/env bash

set -euo pipefail

UUID="ticker-tape@romanornr"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

if [[ -L "${TARGET_DIR}" || -d "${TARGET_DIR}" ]]; then
    rm -rf "${TARGET_DIR}"
    printf 'Removed extension from %s\n' "${TARGET_DIR}"
else
    printf 'Extension directory not found: %s\n' "${TARGET_DIR}"
fi
