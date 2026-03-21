# Ticker Price Extension

This repository contains a minimal GNOME Shell extension for GNOME Shell `49` / `49.5`.

It adds a single `hello world` item to the top bar without replacing the existing shell UI:

- the clock stays in the center
- the normal system indicators stay on the right
- the normal left-side shell entry stays on the left
- `hello world` is inserted on the left side after the default left entry

## Files

- `metadata.json`: extension metadata and supported GNOME Shell versions
- `extension.js`: the extension code that adds the top-bar label

## Install For Local Development

GNOME Shell extensions are installed per user in:

```bash
~/.local/share/gnome-shell/extensions/
```

This extension uses the UUID:

```bash
ticker-price-extension@romano
```

### 1. Create the extension directory

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/ticker-price-extension@romano
```

### 2. Copy the extension files

From this repository directory, run:

```bash
cp metadata.json extension.js ~/.local/share/gnome-shell/extensions/ticker-price-extension@romano/
```

### 3. Enable the extension

```bash
gnome-extensions enable ticker-price-extension@romano
```

If the extension was not installed yet, you can verify GNOME sees it:

```bash
gnome-extensions info ticker-price-extension@romano
```

## Reload GNOME Shell

You usually need to reload GNOME Shell after changing extension files.

### On Xorg

Press `Alt` + `F2`, type:

```text
r
```

then press Enter.

### On Wayland

A full shell restart is not available the same way. Log out and log back in.

You can then disable and re-enable the extension:

```bash
gnome-extensions disable ticker-price-extension@romano
gnome-extensions enable ticker-price-extension@romano
```

## Remove Or Disable The Extension

### Disable without deleting files

```bash
gnome-extensions disable ticker-price-extension@romano
```

### Remove the installed extension files

```bash
rm -rf ~/.local/share/gnome-shell/extensions/ticker-price-extension@romano
```

After removal, log out and back in, or reload GNOME Shell if you are on Xorg.

## Notes

- This is the first minimal version: it only shows a static `hello world` label.
- The extension does not add a menu yet.
- The current placement is the left side of the top bar to avoid the center clock and the right-side status area.
