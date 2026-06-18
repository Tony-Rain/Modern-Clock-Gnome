> **[🇬🇧 English version](README.md)**

[<img src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true" alt="Get it on GNOME Extensions" height="100">](https://extensions.gnome.org/extension/9882/modern-clock/)

# Modern Clock for GNOME

GNOME Shell extension — порт [KDE Modern Clock](https://github.com/Prayag2/kde_modernclock) для GNOME. Те же шрифты (Anurati + Poppins), тот же дизайн.

## Возможности

- Точный дизайн KDE Modern Clock (шрифт Anurati, стиль Mond)
- GNOME 46–50
- Поддержка нескольких мониторов — рендерится на каждом экране, корректный z-order под окнами
- Автоматическое масштабирование под разрешение монитора
- Автоустановка шрифтов при первом запуске
- Настройки прямо в интерфейсе: 24-часовой формат, формат даты
- Виджет на рабочем столе, под всеми окнами
- Wayland и X11

## Скриншоты

![Modern Clock](assets/Modern-Clock1.jpg)

![Modern Clock](assets/Modern-Clock2.png)

## Установка

### Способ 1: Из архива

Скачай `modernclock@gnome-port.zip` из [Releases](https://github.com/Tony-Rain/modern-clock-gnome/releases).

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/modernclock@gnome-port
unzip modernclock@gnome-port.zip -d ~/.local/share/gnome-shell/extensions/modernclock@gnome-port/
```

Перелогинься чтобы система увидела новое расширение, затем включи:

```bash
gnome-extensions enable modernclock@gnome-port
```

Перелогинься ещё раз чтобы расширение заработало.

> Шрифты Anurati и Poppins установятся автоматически при первом запуске расширения.

### Способ 2: Из исходников

```bash
git clone https://github.com/Tony-Rain/modern-clock-gnome.git
cd modern-clock-gnome
make install
```

Перелогинься чтобы расширение заработало.

> На Wayland обязательно logout/login. На X11 можно Alt+F2 → `r` → Enter.

## Настройка

### Через интерфейс настроек

Открой окно настроек:

```bash
gnome-extensions prefs modernclock@gnome-port
```

Или через приложение **Extensions** → Modern Clock → значок шестерёнки.

Там доступно:
- **24-часовой формат** — переключатель между 12ч AM/PM и 24ч
- **Формат даты** — текстовый (`01 MAY 2026`) или числовой (`01.05.2026`)

### Дополнительно: позиция, отступы, символ

Этого пока нет в окне настроек — правится напрямую в константах в начале `extension.js`:

```bash
~/.local/share/gnome-shell/extensions/modernclock@gnome-port/extension.js
```

```javascript
const POSITION  = 'center';      // center | top-right | top-left | bottom-right | bottom-left
const MARGIN_X  = 60;            // отступ по горизонтали
const MARGIN_Y  = 80;            // отступ по вертикали
const TIME_CHAR = '-';           // символ вокруг времени
```

После изменений — перелогинься.

## Удаление

### Если устанавливал из архива (Способ 1) или нет папки репозитория

```bash
gnome-extensions disable modernclock@gnome-port
rm -rf ~/.local/share/gnome-shell/extensions/modernclock@gnome-port
```

### Если устанавливал из исходников (Способ 2)

```bash
cd modern-clock-gnome
make uninstall
```

> `make uninstall` работает только если у тебя есть клонированный репозиторий с Makefile.

### Удалить шрифты (необязательно)

```bash
rm -rf ~/.local/share/fonts/modernclock
fc-cache -f
```

## Решение проблем

**Виджет не появился** — перелогинься (обязательно на Wayland).

**Окно настроек не открывается** — проверь что схема скомпилирована:
```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/modernclock@gnome-port/schemas/
```

**Неправильный шрифт** — проверь установку:
```bash
fc-list | grep -i anurati
```
Если пусто — установи вручную:
```bash
mkdir -p ~/.local/share/fonts/modernclock
cp ~/.local/share/gnome-shell/extensions/modernclock@gnome-port/fonts/* ~/.local/share/fonts/modernclock/
fc-cache -f
```

**Логи:**
```bash
journalctl --user -b 0 | grep -i ModernClock
```

## Известные ограничения

- Не виден во время анимации смены рабочих столов (ограничение GNOME Shell на Wayland)
- Не виден в обзоре Activities

## Благодарности

- Оригинал: [Prayag2/kde_modernclock](https://github.com/Prayag2/kde_modernclock) (GPL-3.0)
- Дизайн: Rainmeter скин "Mond"
- Шрифты: Anurati (SIL OFL), Poppins (SIL OFL / Apache 2.0)

## Лицензия

GPL-3.0
