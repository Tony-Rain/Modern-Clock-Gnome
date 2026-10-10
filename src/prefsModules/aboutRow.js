// SPDX-FileCopyrightText: 2024-2026 Djinn Alexio
// SPDX-FileCopyrightText: 2026 Modern Clock for GNOME Contributors
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {
    gettext as _,
    pgettext,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

//#region Credits
// Feel free to add your name and url in the relevant section below if you have contributed.

// Translators do not need to write in this file and must instead use the "translator_credits"
// string located in the translation files.
const artists = [];
const designers = [];
const developers = [
    'Tony Rain https://github.com/Tony-Rain',
    'Djinn Alexio https://gitlab.gnome.org/DjinnAlexio',
];
const documenters = [];

const copyright = '© 2026 Modern Clock for GNOME Contributors';
const developerName = 'Modern Clock for GNOME Contributors';
const extensionIcon = 'modern-clock-gnome-logo';
const extensionPageUrl = 'https://extensions.gnome.org/extension/9882/modern-clock/';
const issueUrl = 'https://github.com/Tony-Rain/modern-clock-gnome/issues';
const licenseType = Gtk.License.GPL_3_0;
// The string for `release_notes` supports paragraphs <p>, emphasis (italics) <em>, code <code>,
// and ordered <ol> and unordered <ul> lists with <li> list items.
const releaseNotes = ``;
const supportUrl = '';
//#endregion

/**
 * Creates a row that opens an AboutDialog window with information about the extension.
 *
 * @param {ExtensionMetadata} metadata - The metadata object from metadata.json.
 * @returns {Adw.ActionRow} The activatable row that opens the AboutDialog.
 */
export function createAboutRow(metadata) {
    const row = new Adw.ActionRow({
        title: _('About Modern Clock'),
        activatable: true,
    });
    row.add_prefix(new Gtk.Image({ icon_name: 'help-about-symbolic' }));
    row.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));

    //#region About dialog
    row.connect('activated', () => {
        const version = metadata['version-name'] ?? '';
        const aboutWindow = new Adw.AboutDialog({
            application_icon: extensionIcon,
            application_name: metadata.name,
            artists,
            comments: metadata.description,
            copyright,
            designers,
            developer_name: developerName,
            developers,
            documenters,
            issue_url: issueUrl,
            license_type: licenseType,
            release_notes: releaseNotes,
            release_notes_version: version,
            support_url: supportUrl,
            translator_credits: pgettext('(USER)NAME EMAIL', 'translator_credits'),
            version: version,
            website: metadata.url,
        });
        aboutWindow.add_link(_('Extension Page'), extensionPageUrl);
        aboutWindow.add_acknowledgement_section(_('Based on'), [
            'Modern Clock for KDE https://github.com/Prayag2/kde_modernclock',
        ]);
        aboutWindow.add_acknowledgement_section(_('Fonts'), [
            'Anurati https://www.behance.net/gallery/33704618/ANURATI-Free-font',
            'Poppins https://github.com/itfoundry/poppins',
        ]);
        aboutWindow.present(row);
    });
    //#endregion
    return row;
}
