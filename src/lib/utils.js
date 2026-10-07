// SPDX-FileCopyrightText: 2026 Modern Clock for GNOME Contributors
// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import PangoCairo from 'gi://PangoCairo';

const WEEKDAY_NAMES = {
    long: namesFor(7, '%A', d => GLib.DateTime.new_local(2024, 1, d, 0, 0, 0)),
    short: namesFor(7, '%a', d => GLib.DateTime.new_local(2024, 1, d, 0, 0, 0)),
};
const MONTH_NAMES = {
    long: namesFor(12, '%B', m => GLib.DateTime.new_local(2024, m, 1, 0, 0, 0)),
    short: namesFor(12, '%b', m => GLib.DateTime.new_local(2024, m, 1, 0, 0, 0)),
};
// Spaces, format/control characters (bidi marks, zero-width, soft hyphen), and the
// punctuation that appears in locale month/weekday names (e.g. "SEPT.", "D’ABRIL").
const IGNORED_RE = /[\p{Z}\p{Cf}.\-'\u02bc\u2018\u2019]/u;

function namesFor(count, format, makeDate) {
    return Array.from({ length: count }, (v_, i) =>
        makeDate(i + 1)
            .format(format)
            .toUpperCase()
    ).join('');
}
function loadFont(fontFamily) {
    const context = PangoCairo.FontMap.get_default().create_context();
    const desc = new Pango.FontDescription();
    desc.set_family(fontFamily.replace(/['"\\;{}]/g, '').trim());
    desc.set_size(12 * Pango.SCALE);
    return context.load_font(desc);
}
function coversText(font, text) {
    return [...text].every(ch => IGNORED_RE.test(ch) || font.has_char(ch));
}
function getSupport(fontFamily, names) {
    const font = loadFont(fontFamily);
    const requested = fontFamily
        .replace(/['"\\;{}]/g, '')
        .trim()
        .toLowerCase();
    if (!font || font.describe().get_family().toLowerCase() !== requested)
        return { long: false, short: false }; // font not installed (or not loaded yet)
    return { long: coversText(font, names.long), short: coversText(font, names.short) };
}

/**
 * Checks whether a font can render every weekday name in the current locale.
 *
 * The check is done against uppercase names, matching how the extension displays them.
 * Spaces, periods, hyphens, and apostrophes are ignored. Returns `false` for both formats if the
 * font can't be loaded.
 *
 * @param {string} fontFamily - The font family name.
 * @returns {{long: boolean, short: boolean}} The object holding the results on whether the font
 * covers the weekday names full (`%A`, e.g. "MONDAY") and abbreviated (`%a`, e.g. "MON").
 */
export function getWeekdayFontSupport(fontFamily) {
    return getSupport(fontFamily, WEEKDAY_NAMES);
}

/**
 * Checks whether a font can render every month name in the current locale.
 *
 * The check is done against uppercase names, matching how the extension displays them.
 * Spaces, periods, hyphens, and apostrophes are ignored. Returns `false` for both formats if the
 * font can't be loaded.
 *
 * @param {string} fontFamily - The font family name.
 * @returns {{long: boolean, short: boolean}} The object holding the results on whether the font
 * covers the month names full (`%B`, e.g. "JANUARY") and abbreviated (`%b`, e.g. "JAN").
 */
export function getMonthFontSupport(fontFamily) {
    return getSupport(fontFamily, MONTH_NAMES);
}
