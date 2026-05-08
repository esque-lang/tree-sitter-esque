# Makefile for tree-sitter-esque.
#
# Targets:
#   make            — generate parser source from grammar.js
#   make build      — generate + compile to a shared library
#   make test       — run the corpus tests under test/corpus/
#   make parse FILE=path.esq
#                   — parse a single file and dump the syntax tree
#   make install    — install grammar files into ~/.config/tree-sitter
#   make clean      — remove generated parser artifacts

TS          ?= tree-sitter
PREFIX      ?= $(HOME)/.config/tree-sitter
QUERY_DIR   := $(PREFIX)/queries/esque
PARSER_DIR  := $(PREFIX)/parsers
SHARED_LIB  := esque.so
GRAMMAR_GEN := src/parser.c

.PHONY: all generate build test parse install uninstall clean

all: generate

generate $(GRAMMAR_GEN): grammar.js
	$(TS) generate

build: generate
	$(TS) build

test: generate
	$(TS) test

parse: generate
	@if [ -z "$(FILE)" ]; then \
	    echo "usage: make parse FILE=path.esq"; exit 2; \
	fi
	$(TS) parse $(FILE)

playground: generate
	$(TS) playground

# Install queries and the (compiled) shared library so editors that
# look up grammars by name (Helix, nvim-treesitter parser dir, etc.)
# can find them.
install: build
	@mkdir -p $(QUERY_DIR) $(PARSER_DIR)
	cp queries/*.scm $(QUERY_DIR)/
	@if [ -f $(SHARED_LIB) ]; then \
	    cp $(SHARED_LIB) $(PARSER_DIR)/$(SHARED_LIB); \
	    echo "installed parser to $(PARSER_DIR)/$(SHARED_LIB)"; \
	fi
	@echo "installed queries to $(QUERY_DIR)"

uninstall:
	rm -rf $(QUERY_DIR)
	rm -f $(PARSER_DIR)/$(SHARED_LIB)

clean:
	rm -rf src/parser.c src/tree_sitter src/grammar.json src/node-types.json
	rm -f $(SHARED_LIB)
	rm -rf build/
