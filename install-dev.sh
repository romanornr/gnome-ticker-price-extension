#!/usr/bin/env bash

set -euo pipefail

UUID="ticker-tape@romanornr"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

if [[ -e "${TARGET_DIR}" && ! -L "${TARGET_DIR}" ]]; then
    printf 'Removing existing install at %s\n' "${TARGET_DIR}"
    rm -rf "${TARGET_DIR}"
elif [[ -L "${TARGET_DIR}" ]]; then
    rm -f "${TARGET_DIR}"
fi

glib-compile-schemas "${SOURCE_DIR}/schemas"
ln -s "${SOURCE_DIR}" "${TARGET_DIR}"
printf 'Linked %s -> %s\n' "${TARGET_DIR}" "${SOURCE_DIR}"

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
