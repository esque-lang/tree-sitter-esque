package tree_sitter_esque_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-esque"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_esque.Language())
	if language == nil {
		t.Errorf("Error loading Esque grammar")
	}
}
