NAME=gnome-search-scripts
DOMAIN=example.com
UUID=$(NAME)@$(DOMAIN)
DIST_DIR=dist/$(UUID)

.PHONY: all build install pack clean lint format

all: build

lint:
	npm run lint

lint-fix:
	npm run lint:fix

format:
	npm run format

check: lint format
	npm run type-check

node_modules: package.json
	npm install

build: node_modules
	npm run build
	glib-compile-schemas $(DIST_DIR)/schemas

watch: node_modules
	npm run watch

$(NAME).zip: build
	cd $(DIST_DIR) && zip -r ../../$(NAME).zip .

pack: $(NAME).zip

install: build
	@mkdir -p ~/.local/share/gnome-shell/extensions/$(UUID)
	@rm -rf ~/.local/share/gnome-shell/extensions/$(UUID)/*
	@cp -r $(DIST_DIR)/* ~/.local/share/gnome-shell/extensions/$(UUID)/
	@echo "Extension installed to ~/.local/share/gnome-shell/extensions/$(UUID)"

clean:
	@rm -rf dist node_modules $(NAME).zip
	@echo "Cleaned up build artifacts"
