# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GNOME Shell extension (UUID `modernclock@gnome-port`) that renders a desktop clock widget styled after the KDE Modern Clock / Rainmeter Mond skin. It targets GNOME 46–50, runs on Wayland and X11, and works as a below-windows desktop widget.

## Commands

```bash
# Install to ~/.local/share/gnome-shell/extensions/ and enable
make install

# Remove the extension
make uninstall

# Build distributable zip (goes to dist/modernclock@gnome-port.zip)
make dist

# Open settings UI
gnome-extensions prefs modernclock@gnome-port

# Recompile GSettings schema (needed after editing the .xml schema file)
glib-compile-schemas src/schemas/

# View extension logs
journalctl --user -b 0 | grep -i ModernClock
```

After `make install`, a full log-out/log-in is required on Wayland to reload GNOME Shell. On X11 you can use Alt+F2 → `r` instead.

## Architecture

All extension logic lives in `src/`:

- **`extension.js`** — the entire runtime. One class `ModernClockExtension extends Extension`. Key design points:
  - Widget is added to `Main.layoutManager._backgroundGroup` so it renders below all windows (desktop z-order).
  - Font sizes scale linearly off the primary monitor height using `BASE_HEIGHT = 1080` as the reference. `buildStyles(monitorHeight)` returns inline CSS strings; `stylesheet.css` is kept for reference but styles are applied via `St.Label.set_style()` at runtime.
  - Multi-monitor: the primary monitor uses `_container` (a `St.BoxLayout`); each secondary monitor gets an entry in `_extraWidgets[]`, each using a `St.Widget` with `Clutter.BinLayout` and a nearly-transparent background (`rgba(0,0,0,0.01)`) — this is required to force Clutter to allocate the actor in the secondary monitor's stage view.
  - Position is controlled by the module-level `POSITION` constant (not yet exposed in settings). `_reposition()` handles the primary monitor; `_repositionAll()` also loops `_extraWidgets`.
  - Two GLib timeouts fire after `enable()`: 50 ms to reposition (after first layout pass), 500 ms to reposition again (after fonts fully render). Both IDs are cleaned up in `disable()`.
  - Font auto-install: `_installFonts()` copies `fonts/Anurati.otf` and `fonts/Poppins.ttf` into `~/.local/share/fonts/modernclock/` on first enable, then calls `fc-cache -f` and refreshes the Pango font map with `PangoCairo.FontMap.get_default().config_changed()`.

- **`prefs.js`** — settings UI using `Adw.PreferencesPage`. Exposes two GSettings keys: `use-24h` (boolean) and `date-format` (`'text'` | `'numeric'`). The `position` key exists in the schema but is not yet wired in the UI.

- **`schemas/org.gnome.shell.extensions.modernclock.gschema.xml`** — defines the three GSettings keys. After editing this file, run `glib-compile-schemas src/schemas/` and commit the resulting `gschemas.compiled`. The compiled file must be present in the zip for EGO (extensions.gnome.org) submission.

- **`metadata.json`** — extension metadata. `version` field is the EGO release version (integer).

## Hard-wired constants (not in settings yet)

Edit at the top of `extension.js` to change:

```javascript
const POSITION  = 'center';   // center | top-right | top-left | bottom-right | bottom-left
const MARGIN_X  = 60;
const MARGIN_Y  = 80;
const TIME_CHAR = '-';
```

## GNOME Shell API notes

- `Clutter.Color` was removed in GNOME 50 — use inline CSS `color:` instead.
- `St.Label` inline styles (`set_style()`) take precedence over CSS class rules from `stylesheet.css`.
- `label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE` is required to prevent long text being truncated with `…`.
- All GLib timeout IDs must be tracked and removed in `disable()` — leaked timeouts will fire after the extension is disabled.
