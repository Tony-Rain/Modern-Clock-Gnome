# SPDX-License-Identifier: CC0-1.0
# SPDX-FileCopyrightText: No rights reserved

.PHONY: disable enable format install lint pack pot prefs reset shexli test test-legacy uninstall

# set data to default if not it is not already set
XDG_DATA_HOME ?= $(HOME)/.local/share

# file to check if node_modules are installed
NODE_MODULES_STAMP := node_modules/.install-stamp

UUID := $(shell jq -r '.uuid' src/metadata.json)
FONTS_DIR = $(XDG_DATA_HOME)/fonts/modernclock

.DEFAULT_GOAL := pack

pack:
	gnome-extensions pack ./src --extra-source="../LICENSE" --extra-source=assets \
	--extra-source=fonts --extra-source=lib --extra-source="prefsModules" --force
	mkdir -p dist
	mv -f $(UUID).shell-extension.zip dist/
	@echo "✓ Archive: dist/$(UUID).shell-extension.zip"
	@echo ""

install: pack
	gnome-extensions install dist/$(UUID).shell-extension.zip --force
	@echo "✓ Готово! Перелогинься."
	@echo ""

uninstall: disable
	gnome-extensions uninstall $(UUID)
	rm $(FONTS_DIR) -rf
	@echo "✓ Удалено"
	@echo ""

prefs: install
	gnome-extensions prefs $(UUID)
	@echo "✓ Preferences window opened."
	@echo ""

enable:
	gnome-extensions enable $(UUID)
	@echo "✓ Extension enabled."
	@echo ""

disable:
	gnome-extensions disable $(UUID)
	@echo "✓ Extension disabled."
	@echo ""

reset:
	dconf reset -f /org/gnome/shell/extensions/modernclock/
	@echo "✓ Extension settings reset."
	@echo ""

test: install
	@echo "Launching nested shell..."
	G_MESSAGES_DEBUG='GNOME Shell' dbus-run-session gnome-shell --devkit
	@echo ""

test-legacy: install
	@echo "Launching nested shell (GNOME <49)..."
	G_MESSAGES_DEBUG='GNOME Shell' dbus-run-session gnome-shell --nested
	@echo ""

$(NODE_MODULES_STAMP): package-lock.json
	npm ci
	@touch $(NODE_MODULES_STAMP)
	@echo "✓ Installed NodeJS modules."

shexli: pack
	@echo "Running the Shexli static analyzer..."
	shexli dist/$(UUID).shell-extension.zip
	@echo ""

format: $(NODE_MODULES_STAMP)
	@echo "Running Prettier to fix format..."
	npx prettier --write src
	@echo ""

lint: $(NODE_MODULES_STAMP)
	@echo "Running ESLint to catch errors..."
	npx eslint --fix src
	@echo ""

pot:
	xgettext --from-code=UTF-8 --output=src/po/$(UUID).pot src/*.js src/**/*.js
	@echo "✓ Updated '$(UUID).pot' file for translations."
	@echo ""
