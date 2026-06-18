.PHONY: install uninstall dist

UUID = modernclock@gnome-port
EXT_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
FONT_DIR = $(HOME)/.local/share/fonts/modernclock

install:
	rm -rf $(EXT_DIR) && mkdir -p $(EXT_DIR)
	cp -r src/* $(EXT_DIR)/
	glib-compile-schemas $(EXT_DIR)/schemas/ 2>/dev/null || true
	mkdir -p $(FONT_DIR)
	cp -f src/fonts/* $(FONT_DIR)/
	fc-cache -f 2>/dev/null || true
	gnome-extensions enable $(UUID) 2>/dev/null || true
	@echo ""
	@echo "✓ Готово! Перелогинься."

uninstall:
	gnome-extensions disable $(UUID) 2>/dev/null || true
	rm -rf $(EXT_DIR)
	@echo "✓ Удалено"

dist:
	mkdir -p dist
	cd src && zip -r ../dist/$(UUID).zip extension.js metadata.json stylesheet.css prefs.js fonts/ schemas/ -x "schemas/gschemas.compiled"
	@echo "✓ Archive: dist/$(UUID).zip"
