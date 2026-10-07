# SPDX-License-Identifier: CC0-1.0
# SPDX-FileCopyrightText: No rights reserved

.PHONY: check clean disable enable format format-check info install lint lint-check logs \
		logs-prefs pack pot prefs reset schemas shexli test test-legacy test-settings uninstall \
		update-po

XDG_DATA_HOME ?= $(HOME)/.local/share

UUID := $(shell jq -r ".uuid" src/metadata.json)
ZIP := dist/$(UUID).shell-extension.zip
DCONF_DIR := /org/gnome/shell/extensions/modernclock/
FONTS_DIR := $(XDG_DATA_HOME)/fonts/modernclock

NODE_MODULES_STAMP := node_modules/.install-stamp

# ---- Build ---------------------------------------------------------------

pack:
	@mkdir -p dist
	gnome-extensions pack --force ./src --extra-source=../LICENSE --extra-source=assets \
	--extra-source=fonts --extra-source=lib --extra-source=prefsModules --out-dir=dist
	@echo "✓ Extension bundle: $(ZIP)"

clean:
	rm -rf dist
	@echo "✓ Removed dist/."

# ---- Install / run -------------------------------------------------------

install: pack
	gnome-extensions install --force $(ZIP)
	@echo "✓ Installed extension. Log out and back in to load the new version."

uninstall: disable
	gnome-extensions uninstall $(UUID)
	rm -rf $(FONTS_DIR)
	@echo "✓ Uninstalled extension and removed bundled fonts."

enable:
	gnome-extensions enable $(UUID)
	@echo "✓ Enabled extension."

disable:
	gnome-extensions disable $(UUID)
	@echo "✓ Disabled extension."

info:
	gnome-extensions info $(UUID)

prefs: install
	gnome-extensions prefs $(UUID)
	@echo "✓ Preferences window opened."

reset:
	dconf reset -f $(DCONF_DIR)
	@echo "✓ Reset extension settings."

# ---- Testing -------------------------------------------------------------

# requires the mutter-devkit package
test: install
	@echo "Launching nested shell..."
	G_MESSAGES_DEBUG="GNOME Shell" dbus-run-session -- gnome-shell --devkit

test-legacy: install
	@echo "Launching nested shell (GNOME <49)..."
	G_MESSAGES_DEBUG="GNOME Shell" dbus-run-session -- gnome-shell --nested

test-settings: prefs
	@echo "Watching settings changes for the extension..."
	dconf watch $(DCONF_DIR)

logs:
	journalctl -f -o cat /usr/bin/gnome-shell

logs-prefs: prefs
	journalctl -f -o cat /usr/bin/gjs

# ---- Quality -------------------------------------------------------------

$(NODE_MODULES_STAMP): package.json package-lock.json
	npm ci
	@touch $@

lint: $(NODE_MODULES_STAMP)
	npm run lint

lint-check: $(NODE_MODULES_STAMP)
	npm run lint:check

format: $(NODE_MODULES_STAMP)
	npm run format

format-check: $(NODE_MODULES_STAMP)
	npm run format:check

schemas:
	glib-compile-schemas --strict --dry-run src/schemas

check: lint-check format-check schemas

shexli: pack
	@echo "Running the Shexli static analyzer..."
	shexli $(ZIP)

# ---- Translations --------------------------------------------------------

pot:
	@mkdir -p src/po
	find src -name "*.js" | sort | xgettext --from-code=UTF-8 --sort-by-file --files-from=- --output=src/po/$(UUID).pot
	@echo "✓ Updated '$(UUID).pot' file for translations."

update-po: pot
	for po in src/po/*.po; do \
		msgmerge --update --backup=none "$$po" src/po/$(UUID).pot; \
	done
	@echo "✓ Merged new strings into '.po' files."


