// SPDX-FileCopyrightText: 2026 Modern Clock for GNOME Contributors
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {
    ExtensionPreferences,
    gettext as _,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';

import { createLabelPage } from './prefsModules/labelPage.js';
import { createMainPage } from './prefsModules/mainPage.js';
import { getAnuratiWeekdaySupport } from './lib/utils.js';

export default class ModernClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.default_width = 360;
        window.default_height = 600;

        // Add path for custom icons
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        const iconThemePath = GLib.build_filenamev([this.path, 'assets']);
        if (!iconTheme.get_search_path().includes(iconThemePath))
            iconTheme.add_search_path(iconThemePath);

        const settings = this.getSettings();
        const shellVersion = parseFloat(Config.PACKAGE_VERSION);

        //#region Main page
        window.add(
            createMainPage(settings, this.metadata, shellVersion, {
                pageTitle: _('General'),
                pageIcon: 'org.gnome.Settings-symbolic',
            })
        );
        //#endregion

        //#region Label pages
        const weekdayPage = createLabelPage(settings, {
            pageTitle: _('Weekday'),
            pageIcon: 'today-alt2-symbolic',
            keyPrefix: 'weekday',
        });

        const datePage = createLabelPage(settings, {
            pageTitle: _('Date'),
            pageIcon: 'month-symbolic',
            keyPrefix: 'date',
        });
        const timePage = createLabelPage(settings, {
            pageTitle: _('Time'),
            pageIcon: 'preferences-system-time-symbolic',
            keyPrefix: 'time',
        });
        [weekdayPage, datePage, timePage].forEach(page => window.add(page));
        //#endregion

        //#region Weekday format row
        const weekdayFormatGroup = new Adw.PreferencesGroup();
        weekdayPage.add(weekdayFormatGroup);

        let weekdayFormatRow;
        let weekdayFormatToggleGroup;
        if (shellVersion >= 48) {
            weekdayFormatRow = new Adw.ActionRow({ title: _('Format') });
            weekdayFormatToggleGroup = new Adw.ToggleGroup({
                valign: Gtk.Align.CENTER,
                homogeneous: true,
            });
            // weekday-format: 0 = 'long', 1 = 'short'
            weekdayFormatToggleGroup.add(new Adw.Toggle({ label: _('Full'), name: 'long' }));
            weekdayFormatToggleGroup.add(
                new Adw.Toggle({ label: _('Abbreviated'), name: 'short' })
            );
            weekdayFormatToggleGroup.set_active(settings.get_enum('weekday-format'));
            weekdayFormatRow.add_suffix(weekdayFormatToggleGroup);
            weekdayFormatToggleGroup.connect('notify::active', () =>
                settings.set_enum('weekday-format', weekdayFormatToggleGroup.get_active())
            );
        } else {
            weekdayFormatRow = new Adw.ComboRow({
                title: _('Format'),
                model: Gtk.StringList.new([_('Full'), _('Abbreviated')]),
                selected: settings.get_enum('weekday-format'),
            });
            weekdayFormatRow.connect('notify::selected', widget =>
                settings.set_enum('weekday-format', widget.get_selected())
            );
        }

        settings.connect('changed::weekday-format', () => {
            const mode = settings.get_enum('weekday-format');
            if (shellVersion >= 48) weekdayFormatToggleGroup.set_active(mode);
            else weekdayFormatRow.set_selected(mode);
        });

        weekdayFormatGroup.add(weekdayFormatRow);
        //#endregion

        //#region Date format row
        const dateFormatGroup = new Adw.PreferencesGroup();
        datePage.add(dateFormatGroup);

        const dateFormatRow = new Adw.ComboRow({
            title: _('Format'),
            model: Gtk.StringList.new([]),
        });

        const anuratiWeekdaySupport = getAnuratiWeekdaySupport();
        const updateFormatExampleList = () => {
            const mode = settings.get_string('language-mode');
            const useEnglish =
                mode === 'english' ||
                (mode === 'auto' &&
                    !(settings.get_string('weekday-format') === 'long'
                        ? anuratiWeekdaySupport.long
                        : anuratiWeekdaySupport.short));

            const exampleDate = GLib.DateTime.new_local(2026, 9, 1, 0, 0, 0);
            // prettier-ignore
            // date-format: 0 = 'numeric', 1 = 'text', 2 = 'long'
            const strings = useEnglish
                ? ['01.09.2026', '01 SEP 2026', '01 SEPTEMBER 2026']
                : [
                    exampleDate.format('%d.%m.%Y').toUpperCase(),
                    exampleDate.format('%d %b %Y').toUpperCase(),
                    exampleDate.format('%d %B %Y').toUpperCase(),
                ];
            dateFormatRow.model.splice(0, dateFormatRow.model.get_n_items(), strings);
        };
        updateFormatExampleList();

        dateFormatRow.set_selected(settings.get_enum('date-format'));
        dateFormatRow.connect('notify::selected', () =>
            settings.set_enum('date-format', dateFormatRow.get_selected())
        );
        ['language-mode', 'weekday-format'].forEach(key =>
            settings.connect(`changed::${key}`, () => updateFormatExampleList())
        );
        settings.connect('changed::date-format', () =>
            dateFormatRow.set_selected(settings.get_enum('date-format'))
        );

        dateFormatGroup.add(dateFormatRow);
        //#endregion

        //#region Time format row
        const timeFormatGroup = new Adw.PreferencesGroup();
        timePage.add(timeFormatGroup);

        let timeFormatRow;
        let timeFormatToggleGroup;
        if (shellVersion >= 48) {
            timeFormatRow = new Adw.ActionRow({ title: _('Format') });
            timeFormatToggleGroup = new Adw.ToggleGroup({
                valign: Gtk.Align.CENTER,
                homogeneous: true,
            });
            // time-format: 0 = '24h', 1 = '12h'
            timeFormatToggleGroup.add(new Adw.Toggle({ label: _('24-hour'), name: '24h' }));
            timeFormatToggleGroup.add(new Adw.Toggle({ label: _('AM / PM'), name: '12h' }));
            timeFormatToggleGroup.set_active(settings.get_enum('time-format'));
            timeFormatRow.add_suffix(timeFormatToggleGroup);
            timeFormatToggleGroup.connect('notify::active', () =>
                settings.set_enum('time-format', timeFormatToggleGroup.get_active())
            );
        } else {
            timeFormatRow = new Adw.ComboRow({
                title: _('Format'),
                model: Gtk.StringList.new([_('24-hour'), _('AM / PM')]),
                selected: settings.get_enum('time-format'),
            });
            timeFormatRow.connect('notify::selected', widget =>
                settings.set_enum('time-format', widget.get_selected())
            );
        }

        settings.connect('changed::time-format', () => {
            const mode = settings.get_enum('time-format');
            if (shellVersion >= 48) timeFormatToggleGroup.set_active(mode);
            else timeFormatRow.set_selected(mode);
        });

        timeFormatGroup.add(timeFormatRow);
        //#endregion
    }
}
