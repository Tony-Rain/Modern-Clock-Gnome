// SPDX-FileCopyrightText: 2026 Modern Clock for GNOME Contributors
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Pango from 'gi://Pango';
import PangoCairo from 'gi://PangoCairo';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { createScaleRow } from './scaleRow.js';

/**
 * Creates a preferences page for a clock label (weekday, date or time).
 *
 * The page contains an "Appearance" group with rows for visibility, size, letter spacing, color and
 * decoration. Each row is bound to the GSettings key `<keyPrefix>-<suffix>`.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {object} options - The page configuration.
 * @param {string} options.pageTitle - The page title.
 * @param {string} options.pageIcon - The icon name for the page.
 * @param {string} options.keyPrefix - The prefix of the settings keys the page controls.
 * @returns {Adw.PreferencesPage} The page ready to be added to the preferences window.
 */
export function createLabelPage(settings, { pageTitle, pageIcon, keyPrefix }) {
    const page = new Adw.PreferencesPage({
        title: pageTitle,
        icon_name: pageIcon,
    });

    const keys = {
        enabled: `${keyPrefix}-enabled`,
        font: `${keyPrefix}-font`,
        sizeScale: `${keyPrefix}-size-scale`,
        trackingScale: `${keyPrefix}-tracking-scale`,
        color: `${keyPrefix}-color`,
        colorEnabled: `${keyPrefix}-color-enabled`,
        deco: `${keyPrefix}-decorations`,
    };

    const appearanceGroup = new Adw.PreferencesGroup({ title: _('Appearance') });
    page.add(appearanceGroup);

    //#region Show
    const enabledRow = new Adw.SwitchRow({ title: _('Show') });
    settings.bind(keys.enabled, enabledRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    appearanceGroup.add(enabledRow);
    //#endregion

    //#region Font
    const fontRow = new Adw.ActionRow({ title: _('Font') });

    const fontButton = new Gtk.FontDialogButton({
        dialog: new Gtk.FontDialog({ modal: true }),
        level: Gtk.FontLevel.FAMILY,
        font_desc: Pango.FontDescription.from_string('Sans'), // placeholder before the bundled fonts are registered
        use_font: true,
        valign: Gtk.Align.CENTER,
    });
    const fontResetButton = new Gtk.Button({
        icon_name: 'edit-undo-symbolic',
        tooltip_text: _('Reset to default'),
        valign: Gtk.Align.CENTER,
        css_classes: ['flat'],
    });

    const defaultFont = settings.get_default_value(keys.font).deep_unpack();
    const fontFamilies = PangoCairo.FontMap.get_default().list_families();

    function isValidFontFamily(family) {
        if (!family) return false;
        return fontFamilies.some(font => font.get_name().toLowerCase() === family.toLowerCase());
    }

    let syncingFont = false;
    function syncFontFromSettings() {
        const font = settings.get_string(keys.font);
        const desc = Pango.FontDescription.from_string(font);
        syncingFont = true;

        if (isValidFontFamily(desc.get_family())) fontButton.set_font_desc(desc);
        else if (font !== defaultFont) settings.reset(keys.font);
        // - if the font is registered : safe to display
        // - else if it is not the bundled default font: a genuinely invalid value, so reset the key
        // - else: this is the bundled default font, but not yet registered in the fontMap. Do nothing.

        fontResetButton.set_visible(font !== defaultFont);
        syncingFont = false;
    }
    syncFontFromSettings();

    fontButton.connect('notify::font-desc', () => {
        //syncing from a settings change means no need to set the setting again
        if (syncingFont) return;
        const desc = fontButton.get_font_desc();
        if (!desc) return;
        settings.set_string(keys.font, desc.to_string());
        fontResetButton.set_visible(desc.to_string() !== defaultFont);
    });
    fontResetButton.connect('clicked', () => settings.reset(keys.font));
    settings.connect(`changed::${keys.font}`, () => syncFontFromSettings());

    const fontBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    fontBox.append(fontResetButton);
    fontBox.append(fontButton);
    fontRow.add_suffix(fontBox);
    appearanceGroup.add(fontRow);
    //#endregion

    //#region Size
    const sizeScaleRow = createScaleRow(settings, {
        title: _('Size'),
        key: keys.sizeScale,
        marks: [_('Small'), _('Large')],
    });
    appearanceGroup.add(sizeScaleRow);
    //#endregion

    //#region Letter spacing
    const trackingScaleRow = createScaleRow(settings, {
        title: _('Letter Spacing'),
        key: keys.trackingScale,
        marks: [_('Narrow'), _('Wide')],
    });
    appearanceGroup.add(trackingScaleRow);
    //#endregion

    //#region Color
    const colorRow = new Adw.ActionRow({ title: _('Color') });

    const colorButton = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({ modal: true, with_alpha: true }),
        valign: Gtk.Align.CENTER,
    });

    let syncingColor = false;
    function syncColorFromSettings() {
        const rgba = new Gdk.RGBA();
        if (!rgba.parse(settings.get_string(keys.color))) {
            settings.reset(keys.color);
            return;
        }
        syncingColor = true;
        colorButton.set_rgba(rgba);
        syncingColor = false;
    }
    syncColorFromSettings();

    colorButton.connect('notify::rgba', () => {
        //syncing from a settings change means no need to set the setting again
        if (syncingColor) return;
        settings.set_string(keys.color, colorButton.get_rgba().to_string());
    });
    settings.connect(`changed::${keys.color}`, () => syncColorFromSettings());

    const toggle = new Gtk.CheckButton({
        tooltip_text: _('Use custom color'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(keys.colorEnabled, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
    settings.bind(keys.colorEnabled, colorButton, 'sensitive', Gio.SettingsBindFlags.DEFAULT);

    const colorBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 12 });
    colorBox.append(toggle);
    colorBox.append(colorButton);
    colorRow.add_suffix(colorBox);
    appearanceGroup.add(colorRow);
    //#endregion

    //#region Decoration
    const decoRow = new Adw.PreferencesRow({ title: _('Decoration'), activatable: false });

    const decoEntries = ['left', 'right'].map(
        side =>
            new Gtk.Entry({
                placeholder_text: side === 'left' ? _('Prefix') : _('Suffix'),
                valign: Gtk.Align.CENTER,
                hexpand: true,
            })
    );
    decoEntries[0].set_alignment(1);

    const syncDecoFromSettings = () => {
        const stored = settings.get_strv(keys.deco);
        decoEntries.forEach((entry, i) => {
            const value = typeof stored[i] === 'string' ? stored[i] : '';
            if (entry.get_text() !== value) entry.set_text(value);
        });
    };
    syncDecoFromSettings();

    decoEntries.forEach(entry =>
        entry.connect('notify::text', () =>
            settings.set_strv(
                keys.deco,
                decoEntries.map(e => e.get_text())
            )
        )
    );
    settings.connect(`changed::${keys.deco}`, () => syncDecoFromSettings());

    const decoBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 8,
        margin_bottom: 8,
    });
    decoBox.append(decoEntries[0]);
    decoBox.append(decoEntries[1]);
    decoRow.set_child(decoBox);
    appearanceGroup.add(decoRow);
    //#endregion

    return page;
}
