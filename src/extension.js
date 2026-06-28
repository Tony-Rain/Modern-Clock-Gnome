/*
 * Modern Clock for GNOME Shell
 * Порт KDE Modern Clock by Prayag2
 * Совместимо с GNOME 45/46/47/48/49/50+
 *
 * Используем St.Label + inline CSS стили вместо Clutter.Color
 * (Clutter.Color удалён в GNOME 50)
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import PangoCairo from 'gi://PangoCairo';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

// ── Настройки ────────────────────────────────────────────────────────────
const POSITION  = 'center';
const MARGIN_X  = 60;
const MARGIN_Y  = 80;
const TIME_CHAR = '-';

const DAYS   = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

// ── Базовые размеры (для 1080p) ──────────────────────────────────────────
const BASE_HEIGHT   = 1080;
const BASE_DAY_SIZE = 86;
const BASE_DAY_LS   = 20;
const BASE_SUB_SIZE = 23;
const BASE_SUB_LS   = 4;

function buildStyles(monitorHeight) {
    // Масштаб относительно 1080p
    const scale = monitorHeight / BASE_HEIGHT;

    const daySize = Math.round(BASE_DAY_SIZE * scale);
    const dayLs   = Math.round(BASE_DAY_LS * scale);
    const subSize = Math.round(BASE_SUB_SIZE * scale);
    const subLs   = Math.round(BASE_SUB_LS * scale);
    const padTop1 = Math.round(8 * scale);
    const padTop2 = Math.round(4 * scale);

    return {
        day:  `font-family: Anurati, sans-serif; font-size: ${daySize}px; color: #ffffff; letter-spacing: ${dayLs}px; text-align: center;`,
        date: `font-family: Poppins, sans-serif; font-size: ${subSize}px; color: #ffffff; letter-spacing: ${subLs}px; text-align: center; padding-top: ${padTop1}px;`,
        time: `font-family: Poppins, sans-serif; font-size: ${subSize}px; color: #ffffff; letter-spacing: ${subLs}px; text-align: center; padding-top: ${padTop2}px;`,
    };
}


export default class ModernClockExtension extends Extension {

    enable() {
        // ── Load settings
        this._settings = this.getSettings();
        this._settingsChangedId = this._settings.connect('changed', (s, key) => {
            this._updateClock();
            if (key === 'position') this._reposition();
        });

        // ── Load settings
        this._settings = this.getSettings();
        this._settingsChangedId = this._settings.connect('changed', (s, key) => {
            this._updateClock();
            if (key === 'position') this._reposition();
        });

        // ── Автоустановка шрифтов ────────────────────────────────────────
        this._installFonts();

        // ── Определяем масштаб по монитору ──────────────────────────────
        const monitor = Main.layoutManager.primaryMonitor;
        const monH = monitor ? monitor.height : 1080;
        const styles = buildStyles(monH);

        // ── St.Label с динамическими стилями ──────────────────────────────
        this._dayLabel = new St.Label({
            style: styles.day,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });

        this._dateLabel = new St.Label({
            style: styles.date,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });

        this._timeLabel = new St.Label({
            style: styles.time,
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });

        // ── Отключить обрезание текста "..." ──────────────────────────────
        for (const label of [this._dayLabel, this._dateLabel, this._timeLabel]) {
            if (label.clutter_text)
                label.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        }

        // ── Контейнер ─────────────────────────────────────────────────────
        this._container = new St.BoxLayout({
            name: 'ModernClockWidget',
            vertical: true,
            reactive: false,
            can_focus: false,
            track_hover: false,
        });

        this._container.add_child(this._dayLabel);
        this._container.add_child(this._dateLabel);
        this._container.add_child(this._timeLabel);

        // Текст ДО позиционирования
        this._updateClock();

        // Скрываем до позиционирования — без мерцания в углу
        this._container.opacity = 0;

        // Добавляем в _backgroundGroup — под окнами, на рабочем столе
        Main.layoutManager._backgroundGroup.add_child(this._container);

        // Авто-репозиция при изменении высоты (поздняя дорисовка шрифтов
        // меняет аллокацию — без этого виджет «застревает» ниже центра)
        this._heightNotifyId = this._container.connect(
            'notify::height', () => this._reposition()
        );

        // Позиционирование с микрозадержкой
        this._initTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            this._reposition();
            this._container.opacity = 255;
            return GLib.SOURCE_REMOVE;
        });

        // Correct position after fonts are fully rendered
        this._correctTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._reposition();
            return GLib.SOURCE_REMOVE;
        });

        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed', () => { this._rescaleAndReposition(); this._setupExtraMonitors(); }
        );

        // Multi-monitor
        this._extraWidgets = [];
        this._extraWidgets = [];
        this._setupExtraMonitors();

        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, 1, () => {
                this._updateClock();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    disable() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        if (this._container) {
            if (this._heightNotifyId) {
                this._container.disconnect(this._heightNotifyId);
                this._heightNotifyId = null;
            }
            Main.layoutManager._backgroundGroup.remove_child(this._container);
            this._container.destroy();
            this._container = null;
        }
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        this._settings = null;

        if (this._extraWidgets) {
            for (const w of this._extraWidgets) {
                try { if (w.container.get_parent()) w.container.get_parent().remove_child(w.container); } catch(e) {}
                w.container.destroy();
            }
            this._extraWidgets = [];
        }

        if (this._initTimeoutId) {
            GLib.source_remove(this._initTimeoutId);
            this._initTimeoutId = null;
        }
        if (this._correctTimeoutId) {
            GLib.source_remove(this._correctTimeoutId);
            this._correctTimeoutId = null;
        }
        if (this._fadeInTimeoutId) {
            GLib.source_remove(this._fadeInTimeoutId);
            this._fadeInTimeoutId = null;
        }
        if (this._dayLabel) {
            this._dayLabel.destroy();
            this._dayLabel = null;
        }
        if (this._dateLabel) {
            this._dateLabel.destroy();
            this._dateLabel = null;
        }
        if (this._timeLabel) {
            this._timeLabel.destroy();
            this._timeLabel = null;
        }
    }

    _rescaleAndReposition() {
        if (!this._container) return;
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;
        const styles = buildStyles(monitor.height);
        this._dayLabel.set_style(styles.day);
        this._dateLabel.set_style(styles.date);
        this._timeLabel.set_style(styles.time);
        this._reposition();
    }

    _installFonts() {
        // Путь к расширению — разные версии GNOME используют разные свойства
        let extPath = '';
        try {
            if (this.dir)
                extPath = this.dir.get_path();
            else if (this.path)
                extPath = this.path;
            else if (this.metadata && this.metadata.path)
                extPath = this.metadata.path;
            else
                extPath = GLib.build_filenamev([GLib.get_home_dir(),
                    '.local', 'share', 'gnome-shell', 'extensions', 'modernclock@gnome-port']);
        } catch (e) {
            extPath = GLib.build_filenamev([GLib.get_home_dir(),
                '.local', 'share', 'gnome-shell', 'extensions', 'modernclock@gnome-port']);
        }

        log(`[ModernClock] extension path: ${extPath}`);

        const fontsDir = Gio.File.new_for_path(GLib.build_filenamev([extPath, 'fonts']));
        const home = GLib.get_home_dir();
        const destPath = GLib.build_filenamev([home, '.local', 'share', 'fonts', 'modernclock']);
        const destDir = Gio.File.new_for_path(destPath);

        // Создать папку
        try {
            if (!destDir.query_exists(null))
                destDir.make_directory_with_parents(null);
        } catch (e) {
            log(`[ModernClock] mkdir failed: ${e.message}`);
        }

        // Копировать шрифты
        let needsUpdate = false;
        for (const fname of ['Anurati.otf', 'Poppins.ttf']) {
            const src = fontsDir.get_child(fname);
            const dst = destDir.get_child(fname);

            if (!src.query_exists(null)) {
                log(`[ModernClock] font not found: ${src.get_path()}`);
                continue;
            }

            if (dst.query_exists(null))
                continue;

            try {
                src.copy(dst, Gio.FileCopyFlags.NONE, null, null);
                needsUpdate = true;
                log(`[ModernClock] copied ${fname}`);
            } catch (e) {
                log(`[ModernClock] copy failed ${fname}: ${e.message}`);
            }
        }

        if (needsUpdate) {
            try {
                // Синхронный вызов fc-cache — ждём завершения,
                // чтобы шрифт был доступен сразу при первом enable()
                GLib.spawn_command_line_async('fc-cache -f');
                log('[ModernClock] fc-cache completed');
                // Force Pango to re-read fonts in current session
                try {
                    let fontMap = PangoCairo.FontMap.get_default();
                    fontMap.config_changed();
                    log('[ModernClock] Pango font map refreshed');
                } catch(e) {
                    log('[ModernClock] font map refresh failed: ' + e.message);
                }
            } catch (e) {
                log(`[ModernClock] fc-cache failed: ${e.message}`);
            }
        }
    }

    _setupExtraMonitors() {
        // Remove old extra widgets
        if (this._extraWidgets) {
            for (const w of this._extraWidgets) {
                try { if (w.container.get_parent()) w.container.get_parent().remove_child(w.container); } catch(e) {}
                w.container.destroy();
            }
            this._extraWidgets = [];
        }

        const primaryIndex = Main.layoutManager.primaryIndex;
        const monitors = Main.layoutManager.monitors;

        for (let i = 0; i < monitors.length; i++) {
            if (i === primaryIndex) continue;

            const mon = monitors[i];
            const styles = buildStyles(mon.height || 1080);

            const dayLabel = new St.Label({ style: styles.day, x_align: Clutter.ActorAlign.CENTER, x_expand: true });
            const dateLabel = new St.Label({ style: styles.date, x_align: Clutter.ActorAlign.CENTER, x_expand: true });
            const timeLabel = new St.Label({ style: styles.time, x_align: Clutter.ActorAlign.CENTER, x_expand: true });

            try {
                dayLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
                dateLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
                timeLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            } catch(e) {}

            // Container с BinLayout — центрирование labels
            const container = new St.Widget({
                name: 'ModernClockExtra',
                layout_manager: new Clutter.BinLayout(),
                reactive: false, can_focus: false, track_hover: false,
                width: mon.width,
                height: mon.height,
                x: mon.x, y: mon.y,
                // КЛЮЧ: микро-фон даёт actor allocation в stage view
                // второго монитора, иначе Clutter его не рендерит
                style: 'background-color: rgba(0,0,0,0.01);',
            });
            const inner = new St.BoxLayout({
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            inner.add_child(dayLabel);
            inner.add_child(dateLabel);
            inner.add_child(timeLabel);
            container.add_child(inner);
            container.opacity = 0;

            // _backgroundGroup (MetaBackgroundGroup) — culling прячет под окнами
            Main.layoutManager._backgroundGroup.add_child(container);
            this._extraWidgets.push({ container, dayLabel, dateLabel, timeLabel, monitor: mon });
        }

        this._updateClock();
        if (this._fadeInTimeoutId) {
            GLib.source_remove(this._fadeInTimeoutId);
            this._fadeInTimeoutId = null;
        }
        this._fadeInTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._repositionAll();
            for (const w of this._extraWidgets) w.container.opacity = 255;
            this._fadeInTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _repositionAll() {
        this._reposition();
        const POSITION = this._settings.get_string('position');
        for (const w of this._extraWidgets) {
            const mon = w.monitor;
            let x, y, h = w.container.height;
            if (h < 10) h = 100;
            const [, natH] = w.container.get_preferred_height(-1);
            if (natH > h) h = natH;
            switch (POSITION) {
                case 'top-left': x = mon.x + MARGIN_X; y = mon.y + MARGIN_Y; break;
                case 'bottom-right': x = mon.x + mon.width - w.container.width - MARGIN_X; y = mon.y + mon.height - h - MARGIN_Y; break;
                case 'bottom-left': x = mon.x + MARGIN_X; y = mon.y + mon.height - h - MARGIN_Y; break;
                case 'top-right': x = mon.x + mon.width - w.container.width - MARGIN_X; y = mon.y + MARGIN_Y; break;
                case 'center': default: w.container.width = mon.width; x = mon.x; y = mon.y + (mon.height - h) / 2; break;
            }
            w.container.set_position(Math.round(x), Math.round(y));
        }
    }

    _reposition() {
        if (!this._container) return;

        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;

        // get_preferred_*() возвращает [min, natural] — натуральная высота
        // считается из стилей/шрифтов до аллокации, поэтому стабильнее .height
        const [, natH] = this._container.get_preferred_height(-1);
        const [, natW] = this._container.get_preferred_width(-1);
        let w = Math.max(this._container.width, natW);
        let h = Math.max(this._container.height, natH);
        if (h < 10) h = 100;

        let x, y;
        switch (POSITION) {
            case 'top-left':
                x = monitor.x + MARGIN_X;
                y = monitor.y + MARGIN_Y;
                break;
            case 'bottom-right':
                x = monitor.x + monitor.width - w - MARGIN_X;
                y = monitor.y + monitor.height - h - MARGIN_Y;
                break;
            case 'bottom-left':
                x = monitor.x + MARGIN_X;
                y = monitor.y + monitor.height - h - MARGIN_Y;
                break;
            case 'center':
                // Контейнер на всю ширину экрана, текст центрируется внутри
                this._container.width = monitor.width;
                x = monitor.x;
                y = monitor.y + (monitor.height - h) / 2;
                break;
            case 'top-right':
            default:
                x = monitor.x + monitor.width - w - MARGIN_X;
                y = monitor.y + MARGIN_Y;
                break;
        }

        this._container.set_position(Math.round(x), Math.round(y));
    }

    _updateClock() {
        if (!this._dayLabel) return;

        const now = new Date();

        this._dayLabel.set_text(DAYS[now.getDay()]);

        const dd  = String(now.getDate()).padStart(2, '0');
        const dateFormat = this._settings.get_string('date-format');
        if (dateFormat === 'numeric') {
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            this._dateLabel.set_text(`${dd}.${mm}.${now.getFullYear()}`);
        } else {
            const mmm = MONTHS[now.getMonth()];
            this._dateLabel.set_text(`${dd} ${mmm} ${now.getFullYear()}`);
        }

        let hours = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        let t;
        if (this._settings.get_boolean('use-24h')) {
            t = `${String(hours).padStart(2, '0')}:${mins}`;
        } else {
            const ampm = hours < 12 ? 'AM' : 'PM';
            const h12 = hours % 12 || 12;
            t = `${String(h12).padStart(2, '0')}:${mins} ${ampm}`;
        }
        this._timeLabel.set_text(`${TIME_CHAR} ${t} ${TIME_CHAR}`);

        // Обновляем extra-виджеты на других мониторах
        if (this._extraWidgets) {
            const dayText = this._dayLabel.text;
            const dateText = this._dateLabel.text;
            const timeText = this._timeLabel.text;
            for (const w of this._extraWidgets) {
                w.dayLabel.set_text(dayText);
                w.dateLabel.set_text(dateText);
                w.timeLabel.set_text(timeText);
            }
        }
    }
}
