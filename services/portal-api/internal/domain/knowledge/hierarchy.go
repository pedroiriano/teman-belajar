package knowledge

import (
	"context"
	"errors"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

const MaxHierarchyDepth = 8

var (
	ErrNodeNotFound       = errors.New("knowledge node not found")
	ErrInvalidNode        = errors.New("invalid knowledge node")
	ErrHierarchyConflict  = errors.New("knowledge hierarchy conflict")
	ErrHierarchyCycle     = errors.New("knowledge hierarchy cycle")
	ErrHierarchyDepth     = errors.New("knowledge hierarchy depth exceeds eight")
	ErrNodeArchived       = errors.New("knowledge node is archived")
	ErrInvalidNodeOrder   = errors.New("invalid knowledge sibling order")
	ErrArticleAssociation = errors.New("knowledge article association is invalid")
)

type NodeType string

const (
	NodeCollection   NodeType = "collection"
	NodeAspect       NodeType = "aspect"
	NodeIndicator    NodeType = "indicator"
	NodeSubIndicator NodeType = "sub_indicator"
	NodeTopic        NodeType = "topic"
	NodeSection      NodeType = "section"
)

type NodeStatus string

const (
	NodeActive   NodeStatus = "active"
	NodeArchived NodeStatus = "archived"
)

type Node struct {
	ID           string     `json:"id"`
	ParentID     *string    `json:"parent_id,omitempty"`
	Type         NodeType   `json:"type"`
	Slug         string     `json:"slug"`
	Title        string     `json:"title"`
	Description  *string    `json:"description,omitempty"`
	SortOrder    int        `json:"sort_order"`
	Status       NodeStatus `json:"status"`
	Version      int        `json:"version"`
	Depth        int        `json:"depth"`
	ArticleCount int        `json:"article_count"`
	CreatedAt    time.Time  `json:"created_at"`
	CreatedBy    *string    `json:"created_by,omitempty"`
	UpdatedAt    time.Time  `json:"updated_at"`
	UpdatedBy    *string    `json:"updated_by,omitempty"`
}

type TreeNode struct {
	Node
	Children []TreeNode `json:"children"`
}

type Breadcrumb struct {
	ID    string   `json:"id"`
	Slug  string   `json:"slug"`
	Title string   `json:"title"`
	Type  NodeType `json:"type"`
}

type ArticleHierarchy struct {
	NodeID      string       `json:"node_id"`
	Breadcrumbs []Breadcrumb `json:"breadcrumbs"`
}

type CreateNodeInput struct {
	ParentID    *string
	Type        NodeType
	Slug        string
	Title       string
	Description *string
	SortOrder   int
}

type UpdateNodeInput struct {
	ID          string
	Type        NodeType
	Slug        string
	Title       string
	Description *string
	Version     int
}

type MoveNodeInput struct {
	ID        string
	ParentID  *string
	SortOrder int
	Version   int
}

type HierarchyRepository interface {
	ListNodes(ctx context.Context, includeArchived, publishedArticlesOnly bool) ([]Node, error)
	GetNode(ctx context.Context, id string) (*Node, error)
	CreateNode(ctx context.Context, node *Node) error
	UpdateNode(ctx context.Context, node *Node, expectedVersion int) error
	MoveNode(ctx context.Context, nodeID string, parentID *string, sortOrder, expectedVersion int, actorID *string, updatedAt time.Time) error
	ReorderNodes(ctx context.Context, parentID *string, orderedIDs []string, actorID *string, updatedAt time.Time) error
	ArchiveNode(ctx context.Context, nodeID string, expectedVersion int, actorID *string, updatedAt time.Time) error
	AssignArticleNode(ctx context.Context, articleID, nodeID string, actorID *string, updatedAt time.Time) error
	GetArticleHierarchy(ctx context.Context, articleID string, publicOnly bool) (*ArticleHierarchy, error)
}

type HierarchyService struct {
	repo      HierarchyRepository
	auditRepo audit.Repository
}

func NewHierarchyService(repo HierarchyRepository, auditRepo audit.Repository) *HierarchyService {
	return &HierarchyService{repo: repo, auditRepo: auditRepo}
}

var nodeSlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

func IsAllowedNodeType(value NodeType) bool {
	switch value {
	case NodeCollection, NodeAspect, NodeIndicator, NodeSubIndicator, NodeTopic, NodeSection:
		return true
	default:
		return false
	}
}

func normalizeNodeFields(nodeType NodeType, slug, title string, description *string, sortOrder int) (NodeType, string, string, *string, int, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	title = strings.TrimSpace(title)
	if !IsAllowedNodeType(nodeType) || !nodeSlugPattern.MatchString(slug) || utf8.RuneCountInString(slug) > 120 || title == "" || utf8.RuneCountInString(title) > 200 {
		return "", "", "", nil, 0, ErrInvalidNode
	}
	if sortOrder < 1 || sortOrder > 10000 {
		return "", "", "", nil, 0, ErrInvalidNodeOrder
	}
	if description != nil {
		value := strings.TrimSpace(*description)
		if utf8.RuneCountInString(value) > 1000 || strings.IndexFunc(value, func(r rune) bool { return r == '\x00' }) >= 0 {
			return "", "", "", nil, 0, ErrInvalidNode
		}
		if value == "" {
			description = nil
		} else {
			description = &value
		}
	}
	return nodeType, slug, title, description, sortOrder, nil
}

func validateOptionalUUID(value *string) error {
	if value == nil {
		return nil
	}
	if _, err := uuid.Parse(*value); err != nil {
		return ErrInvalidNode
	}
	return nil
}

func (s *HierarchyService) CreateNode(ctx context.Context, input CreateNodeInput, actorID *string) (*Node, error) {
	if err := validateOptionalUUID(input.ParentID); err != nil {
		return nil, err
	}
	nodeType, slug, title, description, sortOrder, err := normalizeNodeFields(input.Type, input.Slug, input.Title, input.Description, input.SortOrder)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	node := &Node{ID: uuid.NewString(), ParentID: input.ParentID, Type: nodeType, Slug: slug, Title: title, Description: description, SortOrder: sortOrder, Status: NodeActive, Version: 1, CreatedAt: now, CreatedBy: actorID, UpdatedAt: now, UpdatedBy: actorID}
	if err := s.repo.CreateNode(ctx, node); err != nil {
		return nil, err
	}
	s.logHierarchyAudit(ctx, actorID, "KNOWLEDGE_NODE_CREATED", node.ID)
	return s.repo.GetNode(ctx, node.ID)
}

func (s *HierarchyService) UpdateNode(ctx context.Context, input UpdateNodeInput, actorID *string) (*Node, error) {
	if _, err := uuid.Parse(input.ID); err != nil || input.Version < 1 {
		return nil, ErrInvalidNode
	}
	current, err := s.repo.GetNode(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	nodeType, slug, title, description, _, err := normalizeNodeFields(input.Type, input.Slug, input.Title, input.Description, current.SortOrder)
	if err != nil {
		return nil, err
	}
	current.Type, current.Slug, current.Title, current.Description = nodeType, slug, title, description
	current.UpdatedAt, current.UpdatedBy = time.Now().UTC(), actorID
	if err := s.repo.UpdateNode(ctx, current, input.Version); err != nil {
		return nil, err
	}
	s.logHierarchyAudit(ctx, actorID, "KNOWLEDGE_NODE_UPDATED", current.ID)
	return s.repo.GetNode(ctx, current.ID)
}

func (s *HierarchyService) MoveNode(ctx context.Context, input MoveNodeInput, actorID *string) (*Node, error) {
	if _, err := uuid.Parse(input.ID); err != nil || validateOptionalUUID(input.ParentID) != nil || input.Version < 1 || input.SortOrder < 1 || input.SortOrder > 10000 {
		return nil, ErrInvalidNode
	}
	if input.ParentID != nil && input.ID == *input.ParentID {
		return nil, ErrHierarchyCycle
	}
	if err := s.repo.MoveNode(ctx, input.ID, input.ParentID, input.SortOrder, input.Version, actorID, time.Now().UTC()); err != nil {
		return nil, err
	}
	s.logHierarchyAudit(ctx, actorID, "KNOWLEDGE_NODE_MOVED", input.ID)
	return s.repo.GetNode(ctx, input.ID)
}

func (s *HierarchyService) ReorderNodes(ctx context.Context, parentID *string, orderedIDs []string, actorID *string) error {
	if validateOptionalUUID(parentID) != nil || len(orderedIDs) == 0 || len(orderedIDs) > 1000 {
		return ErrInvalidNodeOrder
	}
	seen := make(map[string]struct{}, len(orderedIDs))
	for _, id := range orderedIDs {
		if _, err := uuid.Parse(id); err != nil {
			return ErrInvalidNodeOrder
		}
		if _, duplicate := seen[id]; duplicate {
			return ErrInvalidNodeOrder
		}
		seen[id] = struct{}{}
	}
	if err := s.repo.ReorderNodes(ctx, parentID, orderedIDs, actorID, time.Now().UTC()); err != nil {
		return err
	}
	target := "root"
	if parentID != nil {
		target = *parentID
	}
	s.logHierarchyAudit(ctx, actorID, "KNOWLEDGE_NODES_REORDERED", target)
	return nil
}

func (s *HierarchyService) ArchiveNode(ctx context.Context, nodeID string, expectedVersion int, actorID *string) error {
	if _, err := uuid.Parse(nodeID); err != nil || expectedVersion < 1 {
		return ErrInvalidNode
	}
	if err := s.repo.ArchiveNode(ctx, nodeID, expectedVersion, actorID, time.Now().UTC()); err != nil {
		return err
	}
	s.logHierarchyAudit(ctx, actorID, "KNOWLEDGE_NODE_ARCHIVED", nodeID)
	return nil
}

func (s *HierarchyService) AssignArticle(ctx context.Context, articleID, nodeID string, actorID *string) (*ArticleHierarchy, error) {
	if _, err := uuid.Parse(articleID); err != nil {
		return nil, ErrArticleAssociation
	}
	if _, err := uuid.Parse(nodeID); err != nil {
		return nil, ErrArticleAssociation
	}
	if err := s.repo.AssignArticleNode(ctx, articleID, nodeID, actorID, time.Now().UTC()); err != nil {
		return nil, err
	}
	s.logHierarchyAudit(ctx, actorID, "KNOWLEDGE_ARTICLE_NODE_ASSIGNED", articleID)
	return s.repo.GetArticleHierarchy(ctx, articleID, false)
}

func (s *HierarchyService) ArticleHierarchy(ctx context.Context, articleID string, publicOnly bool) (*ArticleHierarchy, error) {
	if _, err := uuid.Parse(articleID); err != nil {
		return nil, ErrArticleAssociation
	}
	return s.repo.GetArticleHierarchy(ctx, articleID, publicOnly)
}

func (s *HierarchyService) Tree(ctx context.Context, includeArchived, publishedArticlesOnly bool) ([]TreeNode, error) {
	nodes, err := s.repo.ListNodes(ctx, includeArchived, publishedArticlesOnly)
	if err != nil {
		return nil, err
	}
	return BuildTree(nodes), nil
}

func BuildTree(nodes []Node) []TreeNode {
	byParent := make(map[string][]Node)
	for _, node := range nodes {
		key := ""
		if node.ParentID != nil {
			key = *node.ParentID
		}
		byParent[key] = append(byParent[key], node)
	}
	for key := range byParent {
		sort.SliceStable(byParent[key], func(i, j int) bool {
			if byParent[key][i].SortOrder == byParent[key][j].SortOrder {
				return byParent[key][i].ID < byParent[key][j].ID
			}
			return byParent[key][i].SortOrder < byParent[key][j].SortOrder
		})
	}
	var build func(string, map[string]bool) []TreeNode
	build = func(parent string, path map[string]bool) []TreeNode {
		children := make([]TreeNode, 0, len(byParent[parent]))
		for _, node := range byParent[parent] {
			if path[node.ID] {
				continue
			}
			next := make(map[string]bool, len(path)+1)
			for id, present := range path {
				next[id] = present
			}
			next[node.ID] = true
			children = append(children, TreeNode{Node: node, Children: build(node.ID, next)})
		}
		return children
	}
	return build("", map[string]bool{})
}

func (s *HierarchyService) logHierarchyAudit(ctx context.Context, actorID *string, action, targetID string) {
	if s.auditRepo == nil {
		return
	}
	actor := ""
	if actorID != nil {
		actor = *actorID
	}
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, TargetType: "knowledge_hierarchy", TargetID: targetID, Result: "SUCCESS", OccurredAt: time.Now().UTC()})
}
