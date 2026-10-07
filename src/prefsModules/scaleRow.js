// SPDX-FileCopyrightText: 2026 Modern Clock for GNOME Contributors
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

/**
 * Creates a row with a horizontal slider over the range 0-1.
 *
 * The slider has five tick marks (0.1, 0.25, 0.5, 0.75, 0.9) with the outer two labeled.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {object} options - The row configuration.
 * @param {string} options.title - The row title. Not displayed, but is used for search.
 * @param {string} options.key - The settings key to bind.
 * @param {string[]} [options.marks=[]] - The labels for the marks at 0.1 and 0.9, in value order.
 * @param {boolean} [options.inverted=false] - Whether the value increases toward the left instead
 * of the right.
 * @returns {Adw.PreferencesRow} The row ready to add to a preferences group.
 */
export function createScaleRow(settings, { title, key, marks = [], inverted = false }) {
    const row = new Adw.PreferencesRow({ title, activatable: false });
    const scale = new Gtk.Scale({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 1,
            step_increment: 0.01,
            page_increment: 0.1,
        }),
        digits: 2,
        round_digits: 2,
        orientation: Gtk.Orientation.HORIZONTAL,
        inverted,
        hexpand: true,
        valign: Gtk.Align.CENTER,
        has_origin: false,
        margin_start: 12,
        margin_end: 12,
        margin_top: 4,
        margin_bottom: 4,
    });
    scale.add_mark(0.1, Gtk.PositionType.TOP, marks[0]);
    scale.add_mark(0.25, Gtk.PositionType.TOP, null);
    scale.add_mark(0.5, Gtk.PositionType.TOP, null);
    scale.add_mark(0.75, Gtk.PositionType.TOP, null);
    scale.add_mark(0.9, Gtk.PositionType.TOP, marks[1]);

    row.set_child(scale);
    settings.bind(key, scale.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);

    return row;
}
