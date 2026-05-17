{
  description = "tree-sitter grammar for the esque programming language";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};

      version = self.shortRev or self.dirtyShortRev or "dev";

      # The compiled grammar shared library. `tree-sitter generate` runs at
      # build time (generate=true is required because src/parser.c is
      # gitignored in this repo), then the parser is compiled into the
      # standard tree-sitter-grammars layout: a `parser` ELF and a `queries/`
      # dir under $out, which is what nvim-treesitter.withPlugins, Helix,
      # and friends expect.
      mkGrammar = pkgs: pkgs.tree-sitter.buildGrammar {
        language = "esque";
        inherit version;
        src = self;
        generate = true;
      };

      # Queries are not part of the compiled grammar derivation; expose them
      # separately so editors that need them at runtime (Helix, nvim-treesitter)
      # can copy them into their runtime dirs.
      mkQueries = pkgs: pkgs.runCommandLocal "tree-sitter-esque-queries" { } ''
        mkdir -p $out
        cp -r ${self}/queries/. $out/
      '';
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = pkgsFor system;
          grammar = mkGrammar pkgs;
          queries = mkQueries pkgs;
        in
        {
          default = grammar;
          tree-sitter-esque = grammar;
          queries = queries;
        });

      # Overlay form so downstream flakes (e.g. glixos-donnis) can fold this
      # into their pkgs set:
      #   nixpkgs.overlays = [ inputs.tree-sitter-esque.overlays.default ];
      # → pkgs.tree-sitter-esque                  (the grammar derivation)
      # → pkgs.tree-sitter-grammars.tree-sitter-esque (matches nixpkgs layout
      #   so nvim-treesitter.withPlugins picks it up by name)
      overlays.default = final: prev: {
        tree-sitter-esque = mkGrammar prev;
        tree-sitter-grammars = (prev.tree-sitter-grammars or { }) // {
          tree-sitter-esque = mkGrammar prev;
        };
      };

      devShells = forAllSystems (system:
        let pkgs = pkgsFor system; in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              tree-sitter
              nodejs
              gcc
              gnumake
            ];
          };
        });

      formatter = forAllSystems (system: (pkgsFor system).nixpkgs-fmt);
    };
}
