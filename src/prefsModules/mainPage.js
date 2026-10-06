// SPDX-FileCopyrightText: 2026 Modern Clock for GNOME Contributors
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { createAboutRow } from './aboutRow.js';
import { createScaleRow } from './scaleRow.js';

/**
 * Creates the main preferences page with the layout, language and information groups.
 *
 * The language group is left out when the LC_TIME language is already English, since all
 * three modes behave the same there.
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {ExtensionMetadata} metadata - The metadata object from metadata.json.
 * @param {number} shellVersion - The GNOME Shell version.
 * @param {object} options - The page configuration.
 * @param {string} options.pageTitle - The page title.
 * @param {string} options.pageIcon - The icon name for the page.
 * @returns {Adw.PreferencesPage} The page ready to add to the preferences window.
 */
export function createMainPage(settings, metadata, shellVersion, { pageTitle, pageIcon }) {
    const page = new Adw.PreferencesPage({
        title: pageTitle,
        icon_name: pageIcon,
    });

    //#region Layout
    const layoutGroup = new Adw.PreferencesGroup({ title: _('Layout') });
    page.add(layoutGroup);

    const horizontalAxisRow = createScaleRow(settings, {
        title: _('Horizontal'),
        key: 'position-x',
        marks: [_('Left'), _('Right')],
    });
    layoutGroup.add(horizontalAxisRow);
    const verticalAxisRow = createScaleRow(settings, {
        title: _('Vertical'),
        key: 'position-y',
        marks: [_('Top'), _('Bottom')],
        inverted: true,
    });
    layoutGroup.add(verticalAxisRow);
    //#endregion

    //#region Find format language
    const systemLocaleSettings = new Gio.Settings({ schema_id: 'org.gnome.system.locale' });
    // Explicit "Formats" override, otherwise the process's LC_TIME
    const regionOverride = systemLocaleSettings.get_string('region');
    const lcTime =
        regionOverride !== ''
            ? regionOverride
            : GLib.get_language_names_with_category('LC_TIME')[0];
    const lcTimeLang = lcTime.split(/[_.@]/)[0];
    const isLcTimeEnglish = ['en', 'C', 'POSIX'].includes(lcTimeLang);
    //#endregion

    //#region Language
    // only relevant if the time format language isn't already in English
    if (!isLcTimeEnglish) {
        const langGroup = new Adw.PreferencesGroup({ title: _('Language') });
        page.add(langGroup);

        // language-mode: 'system'=0, 'auto'=1, 'english'=2
        const langModes = [
            {
                label: _('System'),
                hint: _(
                    'Use your time format language. Some characters may appear in a different font.'
                ),
            },
            {
                label: _('Auto'),
                hint: _(
                    'Use your time format language unless the default weekday font cannot display every weekday.'
                ),
            },
            {
                label: _('English'),
                hint: _('Use English.'),
            },
        ];
        const currentMode = settings.get_enum('language-mode');

        // Subtitle/Hint
        const langSubRow = new Adw.PreferencesRow({ activatable: false });
        const langSubLabel = new Gtk.Label({
            wrap: true,
            justify: Gtk.Justification.CENTER,
            hexpand: true,
            margin_start: 12,
            margin_end: 12,
            margin_top: 8,
            margin_bottom: 8,
            css_classes: ['subtitle'],
        });
        const updateLangSub = keyIndex => langSubLabel.set_label(langModes[keyIndex].hint);
        langSubRow.set_child(langSubLabel);

        // Language Toggle
        let langRow;
        let langToggleGroup;
        if (shellVersion >= 48) {
            langRow = new Adw.PreferencesRow({
                title: _('Mode'),
                activatable: false,
            });

            langToggleGroup = new Adw.ToggleGroup({
                valign: Gtk.Align.CENTER,
                homogeneous: true,
                margin_start: 12,
                margin_end: 12,
                margin_top: 8,
                margin_bottom: 8,
            });
            langModes.forEach(mode => langToggleGroup.add(new Adw.Toggle({ label: mode.label })));
            langToggleGroup.set_active(currentMode);
            updateLangSub(currentMode);

            langToggleGroup.connect('notify::active', () => {
                const index = langToggleGroup.get_active();
                settings.set_enum('language-mode', index);
                updateLangSub(index);
            });

            langRow.set_child(langToggleGroup);
        } else {
            langRow = new Adw.ComboRow({
                title: _('Mode'),
                model: Gtk.StringList.new(langModes.map(mode => mode.label)),
                selected: settings.get_enum('language-mode'),
            });
            updateLangSub(currentMode);
            langRow.connect('notify::selected', () => {
                settings.set_enum('language-mode', langRow.get_selected());
                updateLangSub(langRow.get_selected());
            });
        }

        settings.connect('changed::language-mode', () => {
            const mode = settings.get_enum('language-mode');
            if (shellVersion >= 48) langToggleGroup.set_active(mode);
            else langRow.set_selected(mode);
            updateLangSub(mode);
        });

        langGroup.add(langRow);
        langGroup.add(langSubRow);
    }
    //#endregion

    //#region About
    const aboutGroup = new Adw.PreferencesGroup({ title: _('Information') });
    page.add(aboutGroup);

    const aboutRow = createAboutRow(metadata);
    aboutGroup.add(aboutRow);
    //#endregion

    return page;
}
