import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ModernClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Page
        const page = new Adw.PreferencesPage({
            title: 'Modern Clock',
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(page);

        // Time group
        const timeGroup = new Adw.PreferencesGroup({
            title: 'Time Format',
        });
        page.add(timeGroup);

        // 24h toggle
        const use24hRow = new Adw.SwitchRow({
            title: '24-hour format',
            subtitle: 'Use 24h instead of 12h AM/PM',
        });
        settings.bind('use-24h', use24hRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        timeGroup.add(use24hRow);

        // Date format
        const dateGroup = new Adw.PreferencesGroup({
            title: 'Date Format',
        });
        page.add(dateGroup);

        const dateFormatRow = new Adw.ComboRow({
            title: 'Date format',
            subtitle: 'How the date is displayed',
            model: Gtk.StringList.new(['01 MAY 2026', '01.05.2026']),
        });
        dateFormatRow.set_selected(settings.get_string('date-format') === 'numeric' ? 1 : 0);
        dateFormatRow.connect('notify::selected', () => {
            settings.set_string('date-format', dateFormatRow.get_selected() === 1 ? 'numeric' : 'text');
        });
        dateGroup.add(dateFormatRow);
    }
}
