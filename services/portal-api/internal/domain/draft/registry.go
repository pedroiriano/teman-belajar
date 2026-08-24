package draft

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
)

type fieldKind int

const (
	fieldString fieldKind = iota
	fieldNullableString
	fieldUUIDList
)

type fieldRule struct {
	kind fieldKind
	max  int
}

type formDefinition struct {
	entityType string
	edit       bool
	fields     map[string]fieldRule
}

var formDefinitions = map[string]formDefinition{
	"news.create": {
		entityType: "news",
		fields: map[string]fieldRule{
			"title": {kind: fieldString, max: 200}, "slug": {kind: fieldString, max: 220},
			"excerpt": {kind: fieldString, max: 500}, "body": {kind: fieldString, max: 200000},
			"media_asset_ids": {kind: fieldUUIDList, max: 100},
		},
	},
	"news.edit": {
		entityType: "news", edit: true,
		fields: map[string]fieldRule{
			"title": {kind: fieldString, max: 200}, "slug": {kind: fieldString, max: 220},
			"excerpt": {kind: fieldString, max: 500}, "body": {kind: fieldString, max: 200000},
			"media_asset_ids": {kind: fieldUUIDList, max: 100},
		},
	},
	"announcement.create": {
		entityType: "announcement",
		fields: map[string]fieldRule{
			"title": {kind: fieldString, max: 200}, "slug": {kind: fieldString, max: 220},
			"body": {kind: fieldString, max: 200000}, "start_at": {kind: fieldNullableString, max: 64},
			"end_at": {kind: fieldNullableString, max: 64}, "media_asset_ids": {kind: fieldUUIDList, max: 100},
		},
	},
	"announcement.edit": {
		entityType: "announcement", edit: true,
		fields: map[string]fieldRule{
			"title": {kind: fieldString, max: 200}, "slug": {kind: fieldString, max: 220},
			"body": {kind: fieldString, max: 200000}, "start_at": {kind: fieldNullableString, max: 64},
			"end_at": {kind: fieldNullableString, max: 64}, "media_asset_ids": {kind: fieldUUIDList, max: 100},
		},
	},
	"knowledge.create": {
		entityType: "knowledge",
		fields: map[string]fieldRule{
			"title": {kind: fieldString, max: 255}, "slug": {kind: fieldString, max: 255},
			"summary": {kind: fieldString, max: 2000}, "body": {kind: fieldString, max: 200000},
			"media_asset_ids": {kind: fieldUUIDList, max: 100},
		},
	},
	"knowledge.edit": {
		entityType: "knowledge", edit: true,
		fields: map[string]fieldRule{
			"body": {kind: fieldString, max: 200000}, "media_asset_ids": {kind: fieldUUIDList, max: 100},
		},
	},
}

var sensitiveKeyFragments = []string{
	"password", "passwd", "secret", "token", "credential", "authorization", "cookie", "otp", "api_key", "apikey", "private_key",
}

func validatePayload(input SaveInput) (json.RawMessage, error) {
	definition, ok := formDefinitions[input.FormKey]
	if !ok {
		return nil, ErrUnsupported
	}
	if input.EntityType != definition.entityType || definition.edit != (input.EntityID != nil) {
		return nil, fmt.Errorf("%w: form and entity identity do not match", ErrValidation)
	}
	if len(input.Payload) == 0 || len(input.Payload) > MaxPayloadSize {
		return nil, fmt.Errorf("%w: payload size is invalid", ErrValidation)
	}

	decoder := json.NewDecoder(bytes.NewReader(input.Payload))
	decoder.UseNumber()
	var raw map[string]json.RawMessage
	if err := decoder.Decode(&raw); err != nil || raw == nil {
		return nil, fmt.Errorf("%w: payload must be a JSON object", ErrValidation)
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return nil, fmt.Errorf("%w: payload has trailing data", ErrValidation)
	}

	for key, value := range raw {
		if isSensitiveKey(key) {
			return nil, fmt.Errorf("%w: sensitive field names are forbidden", ErrValidation)
		}
		rule, allowed := definition.fields[key]
		if !allowed {
			return nil, fmt.Errorf("%w: field %q is not allowed for %s", ErrValidation, key, input.FormKey)
		}
		if err := validateField(key, value, rule); err != nil {
			return nil, err
		}
	}

	canonical, err := json.Marshal(raw)
	if err != nil || len(canonical) > MaxPayloadSize {
		return nil, fmt.Errorf("%w: payload cannot be normalized", ErrValidation)
	}
	return canonical, nil
}

func validateField(key string, raw json.RawMessage, rule fieldRule) error {
	switch rule.kind {
	case fieldString, fieldNullableString:
		if rule.kind == fieldNullableString && bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
			return nil
		}
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return fmt.Errorf("%w: field %q must be a string", ErrValidation, key)
		}
		if !utf8.ValidString(value) || utf8.RuneCountInString(value) > rule.max {
			return fmt.Errorf("%w: field %q exceeds its limit", ErrValidation, key)
		}
		if containsPrivateCredentialURL(value) {
			return fmt.Errorf("%w: private or credential-bearing URLs are forbidden", ErrValidation)
		}
	case fieldUUIDList:
		var values []string
		if err := json.Unmarshal(raw, &values); err != nil || len(values) > rule.max {
			return fmt.Errorf("%w: field %q must be a bounded UUID list", ErrValidation, key)
		}
		seen := make(map[string]struct{}, len(values))
		for _, value := range values {
			if _, err := uuid.Parse(value); err != nil {
				return fmt.Errorf("%w: field %q contains an invalid UUID", ErrValidation, key)
			}
			if _, duplicate := seen[value]; duplicate {
				return fmt.Errorf("%w: field %q contains a duplicate UUID", ErrValidation, key)
			}
			seen[value] = struct{}{}
		}
	default:
		return fmt.Errorf("%w: unsupported field definition", ErrValidation)
	}
	return nil
}

func isSensitiveKey(key string) bool {
	normalized := strings.ToLower(strings.TrimSpace(key))
	for _, fragment := range sensitiveKeyFragments {
		if strings.Contains(normalized, fragment) {
			return true
		}
	}
	return false
}

func containsPrivateCredentialURL(value string) bool {
	lower := strings.ToLower(value)
	if strings.Contains(lower, "x-amz-signature") || strings.Contains(lower, "x-amz-credential") {
		return true
	}
	for _, candidate := range strings.Fields(value) {
		parsed, err := url.Parse(strings.Trim(candidate, "()[]<>\"'"))
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			continue
		}
		query := parsed.Query()
		for key := range query {
			if isSensitiveKey(key) {
				return true
			}
		}
	}
	return false
}
