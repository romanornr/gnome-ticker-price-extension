#!/usr/bin/env bash

set -euo pipefail

UUID="ticker-price-extension@romano"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

mkdir -p "${TARGET_DIR}"
cp "${SOURCE_DIR}/metadata.json" "${SOURCE_DIR}/extension.js" "${TARGET_DIR}/"

printf 'Installed extension to %s\n' "${TARGET_DIR}"

if gnome-extensions info "${UUID}" >/dev/null 2>&1 && gnome-extensions enable "${UUID}"; then
    printf 'Enabled extension: %s\n' "${UUID}"
else
    printf 'GNOME Shell has not picked up %s yet.\n' "${UUID}"

    if [[ -n "${WAYLAND_DISPLAY:-}" ]]; then
        printf 'You are on Wayland. Log out and back in, then run: gnome-extensions enable %s\n' "${UUID}"
    else
        printf 'Reload GNOME Shell, then run: gnome-extensions enable %s\n' "${UUID}"
        printf 'On Xorg you can press Alt+F2, type r, and press Enter.\n'
    fi
fi
