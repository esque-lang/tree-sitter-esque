# tree-sitter-esque

[Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for
the [esque](https://github.com/esque-lang/esquec) programming
language — a statically typed, tensor-primitive systems language.

The grammar tracks the v0.13 surface syntax: `@io` / `@kernel`
attributes, the flexible `each` callee, scalar `f64`/`i8`/`u8`,
string literals, and the v0.11 large-N loop primitives (`tabulate`,
`scan`, `iterate`, `iterate_until`, `each`).

## What's included

```
.
├── grammar.js              # the grammar
├── queries/
│   ├── highlights.scm      # syntax highlighting
│   ├── locals.scm          # local-scope resolution
│   ├── tags.scm            # ctags-style symbol tags
│   └── injections.scm      # (placeholder; no injections yet)
├── test/corpus/            # tree-sitter test cases
├── examples/               # sample .esq files
├── Makefile
├── package.json
└── README.md
```

## Requirements

- Node.js 18+ (only used to run `tree-sitter` from npm).
- A C compiler (gcc or clang) on `$PATH` to build the parser shared
  library.
- [`tree-sitter-cli`](https://github.com/tree-sitter/tree-sitter)
  v0.22 or newer.

The fastest way to install the CLI:

```bash
npm install            # picks up the tree-sitter-cli devDependency
npx tree-sitter --version
```

…or globally:

```bash
npm install -g tree-sitter-cli
```

…or via Cargo:

```bash
cargo install tree-sitter-cli
```

## Build

```bash
make            # generate src/parser.c from grammar.js
make build      # generate + compile to a loadable shared library
make test       # run the corpus tests
```

To inspect the AST for a sample file:

```bash
make parse FILE=examples/02_functions.esq
```

To launch the interactive web-based playground:

```bash
make playground
```

## Editor integration

### Helix

`tree-sitter-esque` follows Helix's convention for grammars; once
installed it slots into your `~/.config/helix/languages.toml`:

```toml
[[language]]
name = "esque"
scope = "source.esque"
file-types = ["esq"]
roots = ["go.mod", ".git"]
indent = { tab-width = 4, unit = "    " }
comment-token = "//"

[[grammar]]
name = "esque"
source = { git = "https://github.com/esque-lang/tree-sitter-esque", rev = "main" }
```

Then run:

```bash
hx --grammar fetch
hx --grammar build
```

…and restart Helix.

### Neovim (nvim-treesitter)

Add a custom parser config:

```lua
local parser_config = require('nvim-treesitter.parsers').get_parser_configs()
parser_config.esque = {
  install_info = {
    url = 'https://github.com/esque-lang/tree-sitter-esque',
    files = { 'src/parser.c' },
    branch = 'main',
  },
  filetype = 'esque',
}

vim.filetype.add({ extension = { esq = 'esque' } })
```

Then `:TSInstall esque` and copy `queries/*.scm` to
`~/.config/nvim/queries/esque/`.

### Local install

```bash
make install                # copies queries to $HOME/.config/tree-sitter
make install PREFIX=...     # override target dir
```

## Highlight captures

`queries/highlights.scm` uses the standard tree-sitter capture names
so it works out of the box with both Helix and nvim-treesitter:

| Capture                          | Used for                              |
|----------------------------------|---------------------------------------|
| `@keyword`, `@keyword.control.conditional` | `fn`, `let`, `if`, `match`, …  |
| `@type.builtin`                  | `i32`, `f32`, `bool`, `unit`, `nat`   |
| `@type.parameter`                | shape parameters                      |
| `@function`, `@function.call`    | top-level fns, fn calls               |
| `@function.builtin`              | `tabulate`, `scan`, `iterate`, `each`, `print_*` |
| `@variable`, `@variable.parameter` | locals & params                     |
| `@constant.numeric.integer`      | integer literals                      |
| `@constant.numeric.float`        | float literals                        |
| `@constant.builtin.boolean`      | `true`, `false`                       |
| `@string`, `@constant.character` | string and char literals              |
| `@operator`                      | all infix/prefix operators            |
| `@attribute`                     | `@io`, `@kernel`, `@grad`, …          |
| `@comment.line`, `@comment.block`| `//` and `/* */`                      |

## Grammar conformance

Built against the EBNF in
`docs/reference/language/grammar.md` of the upstream `esquec`
repository. Where the implemented grammar departs from a strict
left-recursive Pratt definition (postfix calls, postfix `as`), the
tree-sitter version uses precedence weights matching the table in
`docs/reference/language/operators.md`.

A handful of points worth flagging:

1. **Nested block comments** — esque allows `/* /* */ */`. Tree-sitter
   regexes can't match nested constructs in pure rules; the grammar
   accepts the *outermost* form. The official lexer (and this
   project's LSP server) enforces full nesting.
2. **`//` reduction** vs. the lexer-special line-comment overlap is
   resolved by the lexer in `esquec`. Tree-sitter handles it the
   same way: `//` always wins as a comment when it begins a token.
3. **Shape arithmetic precedence** is independent of value-space
   precedence. The grammar models it with two precedence levels
   (`+`/`-` < `*`/`/`).

## License

MIT — same as the upstream `esquec` project.
