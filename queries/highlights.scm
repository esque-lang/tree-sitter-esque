; Syntax highlighting for esque.
;
; Capture names follow the standard tree-sitter / Helix / Neovim
; conventions. See:
;   https://docs.helix-editor.com/themes.html#syntax-highlighting
;   https://github.com/nvim-treesitter/nvim-treesitter/blob/master/CONTRIBUTING.md

; -----------------------------------------------------------------------------
; Comments
; -----------------------------------------------------------------------------
(line_comment)  @comment.line
(block_comment) @comment.block

; -----------------------------------------------------------------------------
; Keywords
; -----------------------------------------------------------------------------
[
  "fn"
  "let"
  "return"
  "as"
  "in"
] @keyword

[
  "if"
  "else"
  "match"
] @keyword.control.conditional

; -----------------------------------------------------------------------------
; Built-in primitive types
; -----------------------------------------------------------------------------
(primitive_type) @type.builtin

"nat" @type.builtin

; -----------------------------------------------------------------------------
; Literals
; -----------------------------------------------------------------------------
(integer_literal) @constant.numeric.integer
(float_literal)   @constant.numeric.float
(boolean_literal) @constant.builtin.boolean
(char_literal)    @constant.character
(string_literal)  @string

; -----------------------------------------------------------------------------
; Punctuation
; -----------------------------------------------------------------------------
[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

[
  ","
  ";"
  ":"
  "->"
  "=>"
  "|"
] @punctuation.delimiter

; -----------------------------------------------------------------------------
; Operators
; -----------------------------------------------------------------------------
[
  "+"  "-"  "*"  "/"  "%"
  ".+" ".-" ".*" "./" ".%"
  "@"
  "==" "!=" "<" "<=" ">" ">="
  "&&" "||" "!"
  "="
  "|>"
  ".." "..="
] @operator

; Reduction prefix operators captured via the rule:
(reduce_expression operator: _ @operator)

; -----------------------------------------------------------------------------
; Wildcard
; -----------------------------------------------------------------------------
(wildcard_pattern) @variable.builtin

; -----------------------------------------------------------------------------
; Attributes (e.g. @io, @kernel, @grad)
; -----------------------------------------------------------------------------
(attribute) @attribute
(attribute_name) @attribute

; -----------------------------------------------------------------------------
; Functions
; -----------------------------------------------------------------------------
(function_declaration name: (identifier) @function)

(call_expression function: (identifier) @function.call)

; Built-in / loop primitive calls — highlight differently.
((call_expression
   function: (identifier) @function.builtin)
 (#any-of? @function.builtin
   "tabulate" "scan" "iterate" "iterate_until" "each"
   "print_i32" "print_f32" "print_str"))

; -----------------------------------------------------------------------------
; Parameters
; -----------------------------------------------------------------------------
(parameter name: (identifier) @variable.parameter)
(lambda_parameter name: (identifier) @variable.parameter)
(shape_parameter name: (identifier) @type.parameter)

; Shape variables in tensor types: `f32[N, M]`
(tensor_type
  shape: (shape_variable (identifier) @type.parameter))

; -----------------------------------------------------------------------------
; Local bindings
; -----------------------------------------------------------------------------
(let_statement name: (identifier) @variable)

; -----------------------------------------------------------------------------
; Identifiers (fallback)
; -----------------------------------------------------------------------------
(identifier) @variable
