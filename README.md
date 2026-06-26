# Modern Clock for GNOME

> **[🇷🇺 Русская версия](README_RU.md)**

[<img src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true" alt="Get it on GNOME Extensions" height="100">](https://extensions.gnome.org/extension/9882/modern-clock/)

GNOME Shell extension — a port of [KDE Modern Clock](https://github.com/Prayag2/kde_modernclock) for GNOME. Same fonts (Anurati + Poppins), same design.

## Features

- Exact KDE Modern Clock design (Anurati font, Mond style)
- GNOME 46–50
- Multi-monitor support — renders on every display, correct z-order under windows
- Auto-scaling based on monitor resolution
- Auto font installation on first run
- In-app settings: 24-hour format, date format
- Desktop widget, rendered below all windows
- Wayland & X11

## Multi-monitor support

Rendering a widget on secondary monitors in Wayland is non-trivial. Adding a `St.BoxLayout` to `Main.layoutManager._backgroundGroup` works on the primary monitor, but on secondary monitors the actor gets **zero allocation** in the secondary `ClutterStageView` — it simply doesn't render, with no errors.

**The fix:** add a near-invisible background to the container:

```javascript
const container = new St.BoxLayout({
    style: 'background-color: rgba(0, 0, 0, 0.01);',
    // ...
});
Main.layoutManager._backgroundGroup.add_child(container);
```

Giving the actor something to paint forces Clutter to assign it a real allocation in the secondary monitor's stage view. Combined with `_backgroundGroup` (which implements `MetaCullable`), the widget renders correctly **below all windows on every monitor**, survives wallpaper changes and monitor hotplug.

This behaviour is not documented in the GNOME Shell extension guides — discovered empirically while building this extension.

> Tested on GNOME 46–50, Wayland.

## Screenshots

![Modern Clock](assets/Modern-Clock1.jpg)

![Modern Clock](assets/Modern-Clock2.png)

## Installation

### Method 1: From archive

Download `modernclock@gnome-port.zip` from [Releases](https://github.com/Tony-Rain/modern-clock-gnome/releases).

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/modernclock@gnome-port
unzip modernclock@gnome-port.zip -d ~/.local/share/gnome-shell/extensions/modernclock@gnome-port/
```

Log out and log back in so the system detects the new extension, then enable it:

```bash
gnome-extensions enable modernclock@gnome-port
```

Log out and log back in again for the extension to load.

> Anurati and Poppins fonts are installed automatically on first run.

### Method 2: From source

```bash
git clone https://github.com/Tony-Rain/modern-clock-gnome.git
cd modern-clock-gnome
make install
```

Log out and log back in for the extension to load.

> On Wayland you must log out/in. On X11 you can press Alt+F2 → `r` → Enter.

## Configuration

### Settings UI

Open the settings window:

```bash
gnome-extensions prefs modernclock@gnome-port
```

Or open the **Extensions** app → Modern Clock → the gear icon.

Available there:
- **24-hour format** — toggle between 12h AM/PM and 24h
- **Date format** — text (`01 MAY 2026`) or numeric (`01.05.2026`)

### Advanced: position, margins, character

Not exposed in the Settings UI yet — edit the constants at the top of `extension.js` directly:

```bash
~/.local/share/gnome-shell/extensions/modernclock@gnome-port/extension.js
```

```javascript
const POSITION  = 'center';      // center | top-right | top-left | bottom-right | bottom-left
const MARGIN_X  = 60;            // horizontal margin
const MARGIN_Y  = 80;            // vertical margin
const TIME_CHAR = '-';           // character around time
```

After editing — log out and log back in.

## Uninstallation

### Installed from archive (Method 1)

```bash
gnome-extensions disable modernclock@gnome-port
rm -rf ~/.local/share/gnome-shell/extensions/modernclock@gnome-port
```

### Installed from source (Method 2)

```bash
cd modern-clock-gnome
make uninstall
```

> `make uninstall` only works if you have the cloned repository with the Makefile.

### Remove fonts (optional)

```bash
rm -rf ~/.local/share/fonts/modernclock
fc-cache -f
```

## Troubleshooting

**Widget not visible** — make sure you logged out and back in (required on Wayland).

**Settings window won't open** — make sure the schema compiled correctly:
```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/modernclock@gnome-port/schemas/
```

**Wrong font** — check if Anurati is installed:
```bash
fc-list | grep -i anurati
```
If not found, install manually:
```bash
mkdir -p ~/.local/share/fonts/modernclock
cp ~/.local/share/gnome-shell/extensions/modernclock@gnome-port/fonts/* ~/.local/share/fonts/modernclock/
fc-cache -f
```

**Logs:**
```bash
journalctl --user -b 0 | grep -i ModernClock
```

## Known limitations

- Not visible during workspace switch animation (GNOME Shell limitation on Wayland)
- Not visible in Activities overview

## Credits

- Original: [Prayag2/kde_modernclock](https://github.com/Prayag2/kde_modernclock) (GPL-3.0)
- Design: Rainmeter skin "Mond"
- Fonts: Anurati (SIL OFL), Poppins (SIL OFL / Apache 2.0)

## License

GPL-3.0
