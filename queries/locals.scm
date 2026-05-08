; Local-scope query for esque.
;
; Used by editors to power "go to definition" / rename within a file
; without a real LSP, and to resolve identifier highlights.

; -----------------------------------------------------------------------------
; Scopes
; -----------------------------------------------------------------------------
(source_file)         @local.scope
(function_declaration) @local.scope
(block)               @local.scope
(lambda_expression)   @local.scope
(match_arm)           @local.scope

; -----------------------------------------------------------------------------
; Definitions
; -----------------------------------------------------------------------------
(function_declaration
  name: (identifier) @local.definition.function)

(parameter
  name: (identifier) @local.definition.parameter)

(lambda_parameter
  name: (identifier) @local.definition.parameter)

(shape_parameter
  name: (identifier) @local.definition.type)

(let_statement
  name: (identifier) @local.definition.var)

(bind_pattern
  (identifier) @local.definition.var)

; -----------------------------------------------------------------------------
; References
; -----------------------------------------------------------------------------
(identifier) @local.reference
