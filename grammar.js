/**
 * tree-sitter-esque
 *
 * Tree-sitter grammar for the esque programming language
 * (https://github.com/esque-lang/esquec). Tracks the v0.13 grammar:
 * `@io` effect-typing, the flexible `each` callee, scalar codegen for
 * f64/i8/u8, string literals, and the v0.11 large-N loop primitives
 * (`tabulate`, `scan`, `iterate`, `iterate_until`, `each`).
 */

const PREC = {
  pipeline: 5,
  or:       6,
  and:      7,
  cmp:      10,
  range:    15,
  add:      20,
  mul:      30,
  matmul:   35,
  cast:     38,
  call:     40,
  unary:    50,
};

module.exports = grammar({
  name: 'esque',

  extras: $ => [
    /\s+/,
    $.line_comment,
    $.block_comment,
  ],

  word: $ => $.identifier,

  conflicts: $ => [],

  supertypes: $ => [
    $._expression,
    $._statement,
    $._type,
    $._pattern,
    $._shape_expression,
    $._item,
  ],

  rules: {
    source_file: $ => repeat($._item),

    _item: $ => choice(
      $.function_declaration,
    ),

    // ----------------------------------------------------------------
    // Comments
    // ----------------------------------------------------------------
    // Line comments use `#` as of v0.14 — `//` is the divide-reduction
    // operator (see `reduce_expression`).
    line_comment: _ => token(seq('#', /.*/)),

    // Block comments are nestable in esque. Tree-sitter's regex engine
    // can't match nested constructs, so we approximate with a non-greedy
    // match. The LSP server enforces nesting; for the parser this is
    // acceptable since it's a comment.
    block_comment: _ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/',
    )),

    // ----------------------------------------------------------------
    // Functions
    // ----------------------------------------------------------------
    function_declaration: $ => seq(
      repeat($.attribute),
      'fn',
      field('name', $.identifier),
      optional(field('shape_parameters', $.shape_parameters)),
      field('parameters', $.parameter_list),
      '->',
      field('return_type', $._type),
      choice(
        seq('=', field('body', $._expression)),
        field('body', $.block),
      ),
    ),

    attribute: $ => seq(
      field('name', $.attribute_name),
      optional(seq('(', commaSep($._expression), ')')),
    ),

    // `@<ident>` attribute lead — must be attached (no whitespace).
    attribute_name: _ => token(prec(1, /@[A-Za-z_][A-Za-z0-9_]*/)),

    shape_parameters: $ => seq(
      '[',
      commaSep1($.shape_parameter),
      ']',
    ),

    shape_parameter: $ => seq(
      field('name', $.identifier),
      optional(seq(':', 'nat')),
    ),

    parameter_list: $ => seq(
      '(',
      commaSep($.parameter),
      ')',
    ),

    parameter: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),

    // ----------------------------------------------------------------
    // Types
    // ----------------------------------------------------------------
    _type: $ => choice(
      $.primitive_type,
      $.tensor_type,
    ),

    primitive_type: _ => choice(
      'i8', 'i16', 'i32', 'i64',
      'u8', 'u16', 'u32', 'u64',
      'f32', 'f64',
      'bool', 'unit',
    ),

    tensor_type: $ => prec(1, seq(
      field('element', $.primitive_type),
      '[',
      field('shape', commaSep1($._shape_expression)),
      ']',
    )),

    _shape_expression: $ => choice(
      $.shape_literal,
      $.shape_variable,
      $.shape_binary_expression,
      $.shape_paren,
    ),

    shape_literal: $ => $.integer_literal,
    shape_variable: $ => $.identifier,
    shape_paren: $ => seq('(', $._shape_expression, ')'),
    shape_binary_expression: $ => choice(
      prec.left(1, seq($._shape_expression, choice('+', '-'), $._shape_expression)),
      prec.left(2, seq($._shape_expression, choice('*', '/'), $._shape_expression)),
    ),

    // ----------------------------------------------------------------
    // Statements / blocks
    // ----------------------------------------------------------------
    block: $ => seq(
      '{',
      repeat(seq($._statement, ';')),
      optional(field('result', $._expression)),
      '}',
    ),

    _statement: $ => choice(
      $.let_statement,
      $.return_statement,
      $.expression_statement,
    ),

    let_statement: $ => seq(
      'let',
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
    ),

    return_statement: $ => seq(
      'return',
      optional(field('value', $._expression)),
    ),

    expression_statement: $ => $._expression,

    // ----------------------------------------------------------------
    // Expressions
    // ----------------------------------------------------------------
    _expression: $ => choice(
      $.identifier,
      $.integer_literal,
      $.float_literal,
      $.boolean_literal,
      $.char_literal,
      $.string_literal,
      $.tensor_literal,
      $.parenthesized_expression,
      $.block,
      $.if_expression,
      $.match_expression,
      $.lambda_expression,
      $.let_in_expression,
      $.binary_expression,
      $.unary_expression,
      $.reduce_expression,
      $.cast_expression,
      $.range_expression,
      $.call_expression,
      $.reserved_keyword,
    ),

    // Lexically-reserved keywords that have no syntactic role yet.
    // Matches the v0.13 compiler's reservation set: `mut` is reserved
    // for the future linear-types / mutability work (see esquec
    // `reference/planned/linear-types.md`). Listing the token here
    // teaches the word lexer to never emit it as an identifier.
    reserved_keyword: _ => 'mut',

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tensor_literal: $ => seq('[', commaSep($._expression), ']'),

    if_expression: $ => prec.right(seq(
      'if',
      field('condition', $._expression),
      field('then', $.block),
      optional(seq(
        'else',
        field('else', choice($.block, $.if_expression)),
      )),
    )),

    match_expression: $ => seq(
      'match',
      field('scrutinee', $._expression),
      '{',
      commaSep($.match_arm),
      optional(','),
      '}',
    ),

    match_arm: $ => seq(
      field('pattern', $._pattern),
      optional(seq('if', field('guard', $._expression))),
      '=>',
      field('body', $._expression),
    ),

    _pattern: $ => choice(
      $.wildcard_pattern,
      $.literal_pattern,
      $.bind_pattern,
    ),

    wildcard_pattern: _ => '_',
    literal_pattern: $ => choice(
      $.integer_literal,
      $.boolean_literal,
      $.char_literal,
      seq('-', $.integer_literal),
    ),
    bind_pattern: $ => $.identifier,

    lambda_expression: $ => prec.right(seq(
      '|',
      commaSep($.lambda_parameter),
      '|',
      field('body', $._expression),
    )),

    // `let NAME [: T] = expr in body` expression form. Used in
    // expression position (notably inside lambda bodies); equivalent
    // to a one-statement block.
    let_in_expression: $ => prec.right(seq(
      'let',
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
      'in',
      field('body', $._expression),
    )),

    lambda_parameter: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
    ),

    // Pratt-style precedence layers. The numeric weights match the
    // table in `docs/reference/language/operators.md`.
    binary_expression: $ => {
      const ops = [
        [PREC.pipeline, '|>',  'left'],
        [PREC.or,       '||',  'left'],
        [PREC.and,      '&&',  'left'],
        [PREC.cmp,      '==',  'left'],
        [PREC.cmp,      '!=',  'left'],
        [PREC.cmp,      '<',   'left'],
        [PREC.cmp,      '<=',  'left'],
        [PREC.cmp,      '>',   'left'],
        [PREC.cmp,      '>=',  'left'],
        [PREC.add,      '+',   'left'],
        [PREC.add,      '-',   'left'],
        [PREC.add,      '.+',  'left'],
        [PREC.add,      '.-',  'left'],
        [PREC.mul,      '*',   'left'],
        [PREC.mul,      '/',   'left'],
        [PREC.mul,      '%',   'left'],
        [PREC.mul,      '.*',  'left'],
        [PREC.mul,      './',  'left'],
        [PREC.mul,      '.%',  'left'],
        [PREC.matmul,   '@',   'left'],
      ];
      return choice(...ops.map(([p, op, assoc]) => {
        const wrap = assoc === 'left' ? prec.left
                  : assoc === 'right' ? prec.right
                  : prec;
        return wrap(p, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression),
        ));
      }));
    },

    unary_expression: $ => prec(PREC.unary, choice(
      seq(field('operator', '-'), field('operand', $._expression)),
      seq(field('operator', '!'), field('operand', $._expression)),
    )),

    reduce_expression: $ => prec(PREC.unary, seq(
      field('operator', choice('+/', '-/', '*/', '//')),
      field('operand', $._expression),
    )),

    cast_expression: $ => prec(PREC.cast, seq(
      field('value', $._expression),
      'as',
      field('type', $._type),
    )),

    range_expression: $ => prec.left(PREC.range, seq(
      field('start', $._expression),
      field('operator', choice('..', '..=')),
      field('end', $._expression),
    )),

    // Postfix call. Shape arguments follow the function name in `[ ]`.
    call_expression: $ => prec(PREC.call, seq(
      field('function', $._expression),
      optional(field('shape_arguments', $.shape_arguments)),
      field('arguments', $.argument_list),
    )),

    shape_arguments: $ => seq('[', commaSep1($._shape_expression), ']'),

    argument_list: $ => seq('(', commaSep($._expression), ')'),

    // ----------------------------------------------------------------
    // Literals
    // ----------------------------------------------------------------
    identifier: _ => /[A-Za-z_][A-Za-z0-9_]*/,

    integer_literal: _ => token(seq(
      choice(
        /[0-9][0-9_]*/,
        /0x[0-9a-fA-F][0-9a-fA-F_]*/,
      ),
      optional(/_(i8|i16|i32|i64|u8|u16|u32|u64)/),
    )),

    float_literal: _ => token(choice(
      seq(
        /[0-9][0-9_]*/,
        '.',
        /[0-9][0-9_]*/,
        optional(/[eE][+-]?[0-9]+/),
        optional(/_(f32|f64)/),
      ),
      seq(
        /[0-9][0-9_]*/,
        /[eE][+-]?[0-9]+/,
        optional(/_(f32|f64)/),
      ),
    )),

    boolean_literal: _ => choice('true', 'false'),

    char_literal: _ => token(seq(
      "'",
      choice(
        seq('\\', /[\\'"nrt0]/),
        seq('\\', 'x', /[0-9a-fA-F]{2}/),
        seq('\\', 'u', '{', /[0-9a-fA-F]{1,6}/, '}'),
        /[^'\\\n]/,
      ),
      "'",
    )),

    string_literal: _ => token(seq(
      '"',
      repeat(choice(
        /[^"\\\n]/,
        seq('\\', /[\\"nrt0]/),
        seq('\\', 'x', /[0-9a-fA-F]{2}/),
        seq('\\', 'u', '{', /[0-9a-fA-F]{1,6}/, '}'),
      )),
      '"',
    )),
  },
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
