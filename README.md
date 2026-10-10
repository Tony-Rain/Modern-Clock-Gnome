<div align="center">

[![Language: English][badge-readme-en]][readme-en]
[![Язык: Русский][badge-readme-ru]][readme-ru]
[![Langue : Français][badge-readme-fr]][readme-fr]

# Modern Clock for GNOME

<img alt="Modern Clock Logo" src="./src/assets/modern-clock-gnome-logo.png" height="100">

**A modern-looking clock widget for GNOME!**

[![Supported GNOME versions: 46 to 51][badge-shell]][ego-page]
[![GNOME Extensions downloads][badge-downloads]][ego-page]
[![License][badge-license]][license]
</div>

## Features

A desktop clock widget for GNOME, inspired by [Modern Clock for KDE][modern-clock-kde], and sharing its fonts and default look.

- **Positioning** — can be placed anywhere on the desktop
- **Auto-scaling** — text size scales with each monitor's size (HiDPI-aware)
- **Multi-monitor support** — shown on every display and scaled independently
- **Language** — follows your system locale, falls back to English if the font can't render it, or can be forced into English
- **Show or hide** the weekday, date, and time independently
- **Flexible formats** — full or abbreviated weekday, three date styles, 24-hour or AM/PM time
- **Customizable** — font, size, letter spacing, color, and custom prefixes and suffixes for each line
- **Optionally theme-aware** — can use your system accent color instead of a custom one

> [!NOTE]
> On first run, the bundled fonts are copied to `~/.local/share/fonts/modernclock`, and you need to log out and back in for them to take effect. After uninstalling the extension, you can delete that folder.

## Screenshots

<div align="center">

![Clock widget on a light wallpaper](./images/screenshot1.png)
![Customized clock widget on a dark wallpaper](./images/screenshot2.png)

</div>

## Installation

### From the GNOME Extensions Website (recommended)

<a href="https://extensions.gnome.org/extension/9882/modern-clock/"><img alt="GNOME Extensions page" src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true" height="100"></a>

### From the Repository

> [!NOTE]
> If installed from the repository, the extension will not receive automatic updates from the GNOME Extensions Website.

#### Option 1: Release Zip

Download `modernclock@gnome-port.zip` from [Releases][releases], then install it with:

```bash
gnome-extensions install -f modernclock@gnome-port.zip
```

#### Option 2: Build from Source

```bash
git clone https://github.com/Tony-Rain/modern-clock-gnome.git
cd modern-clock-gnome
make install
```

#### Enable

After installing the package, log out and back in (or just restart the shell with `Alt+F2` > `r` on X11), then enable the extension via the **Extensions** app or run:

```bash
gnome-extensions enable modernclock@gnome-port
```

## Configuration

Open the preferences window via the **Extensions** app or run:

```bash
gnome-extensions prefs modernclock@gnome-port
```

<div align="center">

![Preferences window main page](./images/screenshot_prefs1.png)
![Preferences window time page](./images/screenshot_prefs2.png)

</div>

## Known Limitations

The clock doesn't show during the workspace switch animation (Wayland only), on the lock screen, or in the Activities overview. This is because the widget lives in the shell's background layer.

## Translations

Translations are welcome! The extension uses `gettext`, so new languages only need a `.po` file. Translations of this README are also welcome: copy `README.md` to `README.<lang>.md` (for example, `README.es.md`), translate it, then add it to the language switcher at the top of each README.

## License

GNU General Public License v3.0 or later. See [LICENSE][license].

The bundled fonts are covered by their own licenses and are not part of the GPL-licensed code.

## Acknowledgements

- Original: [Modern Clock for KDE][modern-clock-kde] by Prayag2
- Fonts: [Anurati][anurati], [Poppins][poppins]

[badge-readme-en]: https://img.shields.io/badge/Language-English-3584e4
[badge-readme-fr]: https://img.shields.io/badge/Langue-Fran%C3%A7ais-9141ac
[badge-readme-ru]: https://img.shields.io/badge/%D0%AF%D0%B7%D1%8B%D0%BA-%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-e01b24
[readme-en]: ./README.md
[readme-fr]: ./README.fr.md
[readme-ru]: ./README.ru.md
[ego-page]: https://extensions.gnome.org/extension/9882/modern-clock/
[license]: ./LICENSE
[badge-shell]: https://img.shields.io/badge/GNOME_versions-46_--_51-3584e4?logo=gnome
[badge-downloads]: https://img.shields.io/gnome-extensions/dt/modernclock%40gnome-port?logo=gnome&color=3584e4
[badge-license]: https://img.shields.io/github/license/Tony-Rain/modern-clock-gnome
[modern-clock-kde]: https://github.com/Prayag2/kde_modernclock
[releases]: https://github.com/Tony-Rain/modern-clock-gnome/releases
[anurati]: https://www.behance.net/gallery/33704618/ANURATI-Free-font
[poppins]: https://github.com/itfoundry/poppins
