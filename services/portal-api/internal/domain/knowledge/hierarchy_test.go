package knowledge

import (
	"errors"
	"testing"
)

func TestKnowledgeNodeValidation(t *testing.T) {
	description := "  Deskripsi aman  "
	typeValue, slug, title, normalizedDescription, order, err := normalizeNodeFields(NodeTopic, "  Keamanan-Data ", "  Keamanan Data  ", &description, 2)
	if err != nil || typeValue != NodeTopic || slug != "keamanan-data" || title != "Keamanan Data" || normalizedDescription == nil || *normalizedDescription != "Deskripsi aman" || order != 2 {
		t.Fatalf("unexpected normalization: type=%s slug=%q title=%q description=%v order=%d err=%v", typeValue, slug, title, normalizedDescription, order, err)
	}
	for name, input := range map[string]CreateNodeInput{
		"unknown type": {Type: "division", Slug: "valid", Title: "Valid", SortOrder: 1},
		"unsafe slug":  {Type: NodeTopic, Slug: "Tidak Valid!", Title: "Valid", SortOrder: 1},
		"empty title":  {Type: NodeTopic, Slug: "valid", Title: "", SortOrder: 1},
		"bad order":    {Type: NodeTopic, Slug: "valid", Title: "Valid", SortOrder: 0},
	} {
		t.Run(name, func(t *testing.T) {
			_, _, _, _, _, err := normalizeNodeFields(input.Type, input.Slug, input.Title, input.Description, input.SortOrder)
			if err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
	if !IsAllowedNodeType(NodeCollection) || !IsAllowedNodeType(NodeSection) || IsAllowedNodeType("organization_specific") {
		t.Fatal("node type allowlist is incorrect")
	}
}

func TestBuildTreeIsDeterministicAndCycleSafe(t *testing.T) {
	root := "10000000-0000-0000-0000-000000000001"
	childA := "10000000-0000-0000-0000-000000000002"
	childB := "10000000-0000-0000-0000-000000000003"
	cycleA := "10000000-0000-0000-0000-000000000004"
	cycleB := "10000000-0000-0000-0000-000000000005"
	nodes := []Node{
		{ID: childB, ParentID: &root, Title: "B", SortOrder: 2},
		{ID: root, Title: "Root", SortOrder: 1},
		{ID: childA, ParentID: &root, Title: "A", SortOrder: 1},
		{ID: cycleA, ParentID: &cycleB, Title: "Cycle A", SortOrder: 1},
		{ID: cycleB, ParentID: &cycleA, Title: "Cycle B", SortOrder: 1},
	}
	tree := BuildTree(nodes)
	if len(tree) != 1 || tree[0].ID != root || len(tree[0].Children) != 2 || tree[0].Children[0].ID != childA || tree[0].Children[1].ID != childB {
		t.Fatalf("unexpected deterministic tree: %#v", tree)
	}
}

func TestMoveInputRejectsSelfParentBeforeRepository(t *testing.T) {
	id := "10000000-0000-0000-0000-000000000011"
	service := NewHierarchyService(nil, nil)
	_, err := service.MoveNode(t.Context(), MoveNodeInput{ID: id, ParentID: &id, SortOrder: 1, Version: 1}, nil)
	if !errors.Is(err, ErrHierarchyCycle) {
		t.Fatalf("expected cycle error, got %v", err)
	}
}
