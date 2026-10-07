// SPDX-FileCopyrightText: 2026 Modern Clock for GNOME Contributors
// SPDX-License-Identifier: GPL-3.0-or-later

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GnomeDesktop from 'gi://GnomeDesktop';
import Meta from 'gi://Meta';
import Pango from 'gi://Pango';
import St from 'gi://St';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import { getMonthFontSupport, getWeekdayFontSupport } from './lib/utils.js';

//#region Constants
// -- Base dimensions for 1080p ------------------------------------------------
const BASE_HEIGHT = 1080;
const BASE_SIZE = 48;
const BASE_LS = 16;
const BASE_PADDING_TOP_WEEKDAY = 0;
const BASE_PADDING_TOP_DATE = 2;
const BASE_PADDING_TOP_TIME = 1;
// SCALE_MIN * SCALE_MAX = 1 so that slider=0.5 can give scale=1.0
const SCALE_MIN = 0.25;
const SCALE_MAX = 4;
// -- English ------------------------------------------------------------------
const EN_WEEKDAYS_LONG = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
];
const EN_MONTH_LONG = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
];
const EN_WEEKDAY_NAMES = {
    long: EN_WEEKDAYS_LONG,
    short: EN_WEEKDAYS_LONG.map(m => m.slice(0, 3)),
};
const EN_MONTH_NAMES = { long: EN_MONTH_LONG, short: EN_MONTH_LONG.map(m => m.slice(0, 3)) };
// -- Color --------------------------------------------------------------------
const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i;
const FALLBACK_COLOR = 'rgba(255,255,255,1)'; // white
// -- Font files ---------------------------------------------------------------
const FONT_FILES = ['Anurati.otf', 'Poppins.ttf'];
//#endregion

export default class ModernClockExtension extends Extension {
    //#region enable
    enable() {
        // -- Version check ----------------------------------------------------
        this._shellVersion = parseFloat(Config.PACKAGE_VERSION);

        // -- Custom extension logger ------------------------------------------
        const prefix = `[${this.metadata.name}]`;
        // prettier-ignore
        this._logger =
            this._shellVersion >= 48
                ? this.getLogger()
                : Object.fromEntries(['log', 'warn', 'error', 'debug'].map(
                    level => [level, (...args) => console[level](prefix, ...args)]
                ));

        // -- Get settings -----------------------------------------------------
        this._settings = this.getSettings();

        // Setting migration from boolean 'use-24h' to enum 'time-format'
        const legacy24h = this._settings.get_user_value('use-24h');
        if (legacy24h !== null) {
            this._settings.set_string('time-format', legacy24h.get_boolean() ? '24h' : '12h');
            this._settings.reset('use-24h');
        }

        // -- Get theme -------------------------------------------------
        this._themeContext = St.ThemeContext.get_for_stage(global.stage);
        this._themeColor = this._getThemeColor();

        // -- Install fonts ----------------------------------------------------
        this._fontNotification = { source: null, notification: null };
        this._installFonts(); // fonts will not be loaded on first run
        this._fontsSupport = {
            weekday: getWeekdayFontSupport(this._settings.get_string('weekday-font')),
            date: getMonthFontSupport(this._settings.get_string('date-font')),
        };

        // -- Build clocks when the layout is ready ----------------------------
        this._clockWidgets = [];
        this._lastMonitorSnapshot = null;
        this._startupToken = { ready: false };

        if (Main.layoutManager._startingUp) {
            Main.layoutManager.connectObject(
                'startup-complete',
                () => {
                    Main.layoutManager.disconnectObject(this._startupToken);
                    this._startupToken.ready = true;
                    this._buildAllClocks();
                },
                this._startupToken
            );
        } else {
            this._startupToken.ready = true;
            this._buildAllClocks();
        }

        // -- Connect to settings changes --------------------------------------
        this._settings.connectObject(
            'changed',
            (s_, key) => {
                if (key === 'weekday-font')
                    this._fontsSupport.weekday = getWeekdayFontSupport(
                        this._settings.get_string('weekday-font')
                    );
                if (key === 'date-font')
                    this._fontsSupport.date = getMonthFontSupport(
                        this._settings.get_string('date-font')
                    );

                this._clockWidgets.forEach(clockWidget => {
                    this._updateClockText(clockWidget);
                    this._updateClockStyle(clockWidget);
                    this._queuePositionUpdate(clockWidget);
                });
            },
            this
        );

        // -- Connect to theme changes -----------------------------------------
        this._themeContext.connectObject(
            'changed',
            () => {
                this._themeColor = this._getThemeColor();
                this._clockWidgets.forEach(clockWidget => this._updateClockStyle(clockWidget));
            },
            this
        );

        // -- Connect to monitor changes ---------------------------------------
        Main.layoutManager.connectObject(
            'monitors-changed',
            () => {
                if (this._lastMonitorSnapshot !== this._snapshotMonitor()) this._buildAllClocks();
            },
            this
        );

        // -- Connect to work areas changes ------------------------------------
        global.display.connectObject(
            'workareas-changed',
            () => this._clockWidgets.forEach(clockWidget => this._queuePositionUpdate(clockWidget)),
            this
        );

        // -- Connect to GNOME Clock -------------------------------------------
        this._wallClock = new GnomeDesktop.WallClock();
        this._lastMinute = null;
        this._wallClock.connectObject(
            'notify::clock',
            () => {
                const now = GLib.DateTime.new_now_local();
                const minute = now.get_hour() * 60 + now.get_minute();
                if (this._lastMinute === minute) return;

                this._lastMinute = minute;
                this._clockWidgets.forEach(clockWidget => {
                    this._updateClockText(clockWidget);
                    this._queuePositionUpdate(clockWidget);
                });
            },
            this
        );
    }
    //#endregion

    //#region disable
    disable() {
        this._wallClock.disconnectObject(this);
        this._wallClock = null;

        global.display.disconnectObject(this);

        Main.layoutManager.disconnectObject(this);
        Main.layoutManager.disconnectObject(this._startupToken);
        this._startupToken = null;

        this._themeContext.disconnectObject(this);
        this._themeContext = null;
        this._themeColor = null;

        if (this._fontNotification.source) this._fontNotification.source.destroy();
        this._fontNotification = null;

        this._settings.disconnectObject(this);
        this._settings = null;

        this._destroyAllClocks();
        this._clockWidgets = [];
        this._fontsSupport = null;
        this._lastMonitorSnapshot = null;
        this._lastMinute = null;
        this._logger = null;
    }
    //#endregion

    //#region buildAllClocks
    _buildAllClocks() {
        if (!this._startupToken.ready) return;

        // Remove old clocks
        this._destroyAllClocks();
        this._clockWidgets = [];

        const monitors = Main.layoutManager.monitors;
        this._lastMonitorSnapshot = this._snapshotMonitor();
        this._clockWidgets = monitors.map(monitor => this._buildClock(monitor));
    }
    //#endregion

    //#region destroyAllClocks
    _destroyAllClocks() {
        this._clockWidgets.forEach(clockWidget => {
            if (clockWidget.positionLaterId) {
                global.compositor.get_laters().remove(clockWidget.positionLaterId);
                clockWidget.positionLaterId = null;
            }
            clockWidget.disconnectObject(this);
            clockWidget.destroy();
        });
    }
    //#endregion

    //#region buildClock
    _buildClock(monitor) {
        // Build widget
        const container = new St.BoxLayout({
            name: `ModernClockWidget-${monitor.index}`,
            style: 'background: transparent;',
            can_focus: false,
            reactive: false,
            track_hover: false,
        });
        if (this._shellVersion >= 48) container.set_orientation(Clutter.Orientation.VERTICAL);
        else container.set_vertical(true);
        container.monitor = monitor;
        container.positionLaterId = null;

        // Build labels
        container.weekdayLabel = new St.Label();
        container.dateLabel = new St.Label();
        container.timeLabel = new St.Label();

        [container.weekdayLabel, container.dateLabel, container.timeLabel].forEach(label => {
            label.set_x_align(Clutter.ActorAlign.CENTER);
            label.set_x_expand(true);
            label.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
            container.add_child(label);
        });

        // Add to layout
        Main.layoutManager._backgroundGroup.add_child(container);

        // Connect to allocation signal (to cover edge cases not covered by the other signals)
        container.connectObject(
            'notify::allocation',
            () => this._queuePositionUpdate(container),
            this
        );

        // Setup widget
        this._updateClockText(container);
        this._updateClockStyle(container);
        this._queuePositionUpdate(container);

        return container;
    }
    //#endregion

    //#region snapshotMonitor
    _snapshotMonitor() {
        return Main.layoutManager.monitors
            .map(m => `${m.index}:${m.x},${m.y},${m.width}x${m.height}`)
            .join('|');
    }
    //#endregion

    //#region updateClockText
    _updateClockText(clockWidget) {
        const now = GLib.DateTime.new_now_local();
        const weekdayFormat = this._settings.get_string('weekday-format');
        const dateFormat = this._settings.get_string('date-format');
        const mode = this._settings.get_string('language-mode');

        // Weekday
        let weekday;
        const useEnglishWeekday =
            mode === 'english' ||
            (mode === 'auto' &&
                !(weekdayFormat === 'long'
                    ? this._fontsSupport.weekday.long
                    : this._fontsSupport.weekday.short));
        if (weekdayFormat === 'long') {
            weekday = useEnglishWeekday
                ? EN_WEEKDAY_NAMES.long[now.get_day_of_week() - 1]
                : now.format('%A').toUpperCase();
        } else {
            weekday = useEnglishWeekday
                ? EN_WEEKDAY_NAMES.short[now.get_day_of_week() - 1]
                : now.format('%a').toUpperCase();
        }

        // Date
        let date;
        const useEnglishDate =
            mode === 'english' ||
            (mode === 'auto' &&
                !(dateFormat === 'long'
                    ? this._fontsSupport.date.long
                    : this._fontsSupport.date.short));
        switch (dateFormat) {
            case 'long':
                date = useEnglishDate
                    ? now.format(`%d ${EN_MONTH_NAMES.long[now.get_month() - 1]} %Y`)
                    : now.format('%d %B %Y').toUpperCase();
                break;
            case 'numeric':
                date = now.format('%d.%m.%Y');
                break;
            case 'text':
            default:
                date = useEnglishDate
                    ? now.format(`%d ${EN_MONTH_NAMES.short[now.get_month() - 1]} %Y`)
                    : now.format('%d %b %Y').toUpperCase();
                break;
        }

        // Time
        let time;
        if (this._settings.get_string('time-format') === '24h') {
            time = `${now.format('%H:%M')}`;
        } else {
            // Manually calculate AM/PM format because some locales don't support it
            const hours = now.get_hour();
            const h12 = hours % 12 || 12;
            const ampm = hours < 12 ? 'AM' : 'PM';
            time = `${now.format(`${h12.toString().padStart(2, '0')}:%M ${ampm}`)}`;
        }

        const decorate = (text, decorations) => {
            let decoArray = Array.isArray(decorations) ? decorations : [];
            decoArray = [decoArray[0], decoArray[1]].map(item => {
                if (typeof item === 'string') return item;
                else return '';
            });
            return [decoArray[0], text, decoArray[1]].filter(Boolean).join(' ');
        };
        clockWidget.weekdayLabel.set_text(
            decorate(weekday, this._settings.get_strv('weekday-decorations'))
        );
        clockWidget.dateLabel.set_text(decorate(date, this._settings.get_strv('date-decorations')));
        clockWidget.timeLabel.set_text(decorate(time, this._settings.get_strv('time-decorations')));
    }
    //#endregion

    //#region updateClockStyle
    _updateClockStyle(clockWidget) {
        // Update the monitor
        const monitor = Main.layoutManager.monitors[clockWidget.monitor.index];
        if (!monitor) return;
        clockWidget.monitor = monitor;

        const referenceDimension = Math.min(clockWidget.monitor.width, clockWidget.monitor.height);
        const monitorScale = referenceDimension / BASE_HEIGHT;

        clockWidget.weekdayLabel.visible = this._settings.get_boolean('weekday-enabled');
        clockWidget.dateLabel.visible = this._settings.get_boolean('date-enabled');
        clockWidget.timeLabel.visible = this._settings.get_boolean('time-enabled');

        if (clockWidget.weekdayLabel.visible) {
            clockWidget.weekdayLabel.set_style(
                this._createLabelStyle(monitorScale, {
                    fontFace: this._settings.get_string('weekday-font'),
                    sizeScale: this._settings.get_double('weekday-size-scale'),
                    letterSpacingScale: this._settings.get_double('weekday-tracking-scale'),
                    basePaddingTop: BASE_PADDING_TOP_WEEKDAY,
                    color: this._settings.get_string('weekday-color'),
                    colorEnabled: this._settings.get_boolean('weekday-color-enabled'),
                })
            );
        }
        if (clockWidget.dateLabel.visible) {
            clockWidget.dateLabel.set_style(
                this._createLabelStyle(monitorScale, {
                    fontFace: this._settings.get_string('date-font'),
                    sizeScale: this._settings.get_double('date-size-scale'),
                    letterSpacingScale: this._settings.get_double('date-tracking-scale'),
                    basePaddingTop: BASE_PADDING_TOP_DATE,
                    color: this._settings.get_string('date-color'),
                    colorEnabled: this._settings.get_boolean('date-color-enabled'),
                })
            );
        }
        if (clockWidget.timeLabel.visible) {
            clockWidget.timeLabel.set_style(
                this._createLabelStyle(monitorScale, {
                    fontFace: this._settings.get_string('time-font'),
                    sizeScale: this._settings.get_double('time-size-scale'),
                    letterSpacingScale: this._settings.get_double('time-tracking-scale'),
                    basePaddingTop: BASE_PADDING_TOP_TIME,
                    color: this._settings.get_string('time-color'),
                    colorEnabled: this._settings.get_boolean('time-color-enabled'),
                })
            );
        }
    }
    //#endregion

    //#region createLabelStyle
    _createLabelStyle(
        monitorScale,
        { fontFace, sizeScale, letterSpacingScale, basePaddingTop, color, colorEnabled }
    ) {
        const safeFontFace = fontFace.replace(/['"\\;{}]/g, '').trim();

        const computePx = (base, sliderValue) => {
            const userScale = SCALE_MIN * Math.pow(SCALE_MAX / SCALE_MIN, sliderValue);
            const scale = monitorScale * userScale;
            return Math.round(base * scale);
        };
        const fontSize = computePx(BASE_SIZE, sizeScale);
        const letterSpacing = computePx(BASE_LS, letterSpacingScale);
        const paddingTop = computePx(basePaddingTop, sizeScale);

        const sanitizeColor = value => {
            if (typeof value !== 'string') return FALLBACK_COLOR;
            const v = value.trim();

            // test HEX format
            if (HEX_RE.test(v)) return v.toLowerCase();

            // sanitize RGB format
            const match = RGB_RE.exec(v);
            if (match) {
                const clamp = (n, max) => Math.min(Math.max(Number(n), 0), max);
                const r = Math.round(clamp(match[1], 255));
                const g = Math.round(clamp(match[2], 255));
                const b = Math.round(clamp(match[3], 255));
                const a = match[4] === undefined ? 1 : clamp(match[4], 1);
                return `rgba(${r},${g},${b},${a})`;
            }

            return FALLBACK_COLOR;
        };
        const styleColor = colorEnabled ? sanitizeColor(color) : this._themeColor;

        return (
            `font-family: '${safeFontFace}', sans-serif;` +
            `font-size: ${fontSize}px;` +
            `letter-spacing: ${letterSpacing}px;` +
            `padding-top: ${paddingTop}px;` +
            `color: ${styleColor};`
        );
    }
    //#endregion

    //#region getThemeColor
    _getThemeColor() {
        const candidates = ['calendar-today', 'button default', 'osd-monitor-label'];
        // Items that commonly get an accent color from custom themes
        // - 'calendar-today': highlight for the current day in the GNOME calendar
        // - 'button default': default action button
        // - 'osd-monitor-label': number overlaid on each display when rearranging them in Settings;
        //   rarely overridden, so usually still carries '-st-accent-color' as a fallback

        let color = null;
        let found = false;
        for (const styleClass of candidates) {
            const dummy = new St.Widget({ style_class: styleClass });
            global.stage.add_child(dummy);
            color = dummy.get_theme_node().get_background_color();
            global.stage.remove_child(dummy);
            dummy.destroy();

            if (
                color.alpha > 0 && // Color is visible
                !(color.red === color.green && color.green === color.blue) // Color isn't black or grey
            ) {
                found = true;
                break;
            }
        }

        if (found) return `rgb(${color.red},${color.green},${color.blue})`;
        else return FALLBACK_COLOR;
    }
    //#endregion

    //#region updateClockPosition
    _updateClockPosition(clockWidget) {
        const workArea = Main.layoutManager.getWorkAreaForMonitor(clockWidget.monitor.index);

        const positionX = this._settings.get_double('position-x');
        const positionY = this._settings.get_double('position-y');
        const [, width] = clockWidget.get_preferred_width(-1);
        const [, height] = clockWidget.get_preferred_height(-1);

        const x = Math.round(workArea.x + positionX * (workArea.width - width));
        const y = Math.round(workArea.y + positionY * (workArea.height - height));

        if (clockWidget.x !== x || clockWidget.y !== y) clockWidget.set_position(x, y);
    }
    //#endregion

    //#region queuePositionUpdate
    _queuePositionUpdate(clockWidget) {
        if (clockWidget.positionLaterId) return;

        clockWidget.positionLaterId = global.compositor
            .get_laters()
            .add(Meta.LaterType.BEFORE_REDRAW, () => {
                clockWidget.positionLaterId = null;
                this._updateClockPosition(clockWidget);
                return GLib.SOURCE_REMOVE;
            });
    }
    //#endregion

    //#region installFonts
    _installFonts() {
        const fontsDir = Gio.File.new_for_path(
            GLib.build_filenamev([GLib.get_user_data_dir(), 'fonts', 'modernclock'])
        );

        const fontsPresent = () =>
            fontsDir.query_exists(null) &&
            FONT_FILES.every(fontName => fontsDir.get_child(fontName).query_exists(null));

        if (fontsPresent()) return;

        // prettier-ignore
        this._logger.log(
            `Modern Clock fonts missing, installing them at ${fontsDir.get_path()}. ` +
            'Takes effect next session.'
        );
        try {
            const srcDir = Gio.File.new_for_path(GLib.build_filenamev([this.path, 'fonts']));
            if (!fontsDir.query_exists(null)) fontsDir.make_directory_with_parents(null);
            FONT_FILES.forEach(fontName => {
                const srcChild = srcDir.get_child(fontName);
                const destChild = fontsDir.get_child(fontName);
                srcChild.copy(destChild, Gio.FileCopyFlags.OVERWRITE, null, null);
            });
            this._notifyFontsInstalled();
        } catch (e) {
            this._logger.warn('failed to install fonts:', e);
        }
    }
    //#endregion

    //#region notifyFontsInstalled
    _notifyFontsInstalled() {
        this._fontNotification.source = new MessageTray.Source({
            title: this.metadata.name,
            iconName: 'dialog-information', // or extension icon
        });
        this._fontNotification.source.connectObject(
            'destroy',
            () => (this._fontNotification.source = null),
            this
        );
        Main.messageTray.add(this._fontNotification.source);

        this._fontNotification.notification = new MessageTray.Notification({
            source: this._fontNotification.source,
            title: _('Modern Clock Fonts Installed'),
            body: _('Log out and back in for the new fonts to take effect.'),
            iconName: 'font-x-generic-symbolic',
        });
        this._fontNotification.notification.connectObject(
            'activated',
            () => this.openPreferences(),
            this
        );
        this._fontNotification.source.addNotification(this._fontNotification.notification);
    }
    //#endregion
}
