package media

import (
	"bytes"
	"errors"
	"path/filepath"
	"strings"
	"unicode"
)

const (
	MaxImageBytes       int64 = 2_621_440
	MaxImageSourceBytes int64 = 20_971_520
	MaxDocumentBytes    int64 = 20_971_520
	MaxVideoBytes       int64 = 52_428_800
	MaxObjectBytes      int64 = MaxVideoBytes
	MaxMultipartBytes   int64 = 67_108_864
	MaxFilenameRunes          = 255
	MaxMetadataRunes          = 2_000
)

var (
	ErrInvalidFilename          = errors.New("invalid filename")
	ErrExtensionMimeMismatch    = errors.New("file extension does not match detected media type")
	ErrImageCompressionRequired = errors.New("image compression required")
	ErrInvalidFilter            = errors.New("invalid media filter")
	ErrInvalidUsage             = errors.New("invalid media usage")
	ErrUsageEntityNotFound      = errors.New("media usage entity not found")
	ErrInvalidMetadata          = errors.New("invalid media metadata")
)

var extensionToMIME = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
	".pdf":  "application/pdf",
	".mp4":  "video/mp4",
	".webm": "video/webm",
}

type UploadPolicy struct {
	AllowedExtensions   []string          `json:"allowed_extensions"`
	AllowedMIMETypes    []string          `json:"allowed_mime_types"`
	ExtensionMIMETypes  map[string]string `json:"extension_mime_types"`
	MaxImageBytes       int64             `json:"max_image_bytes"`
	MaxImageSourceBytes int64             `json:"max_image_source_bytes"`
	MaxDocumentBytes    int64             `json:"max_document_bytes"`
	MaxVideoBytes       int64             `json:"max_video_bytes"`
	MaxObjectBytes      int64             `json:"max_object_bytes"`
	MaxMultipartBytes   int64             `json:"max_multipart_bytes"`
}

func Policy() UploadPolicy {
	return UploadPolicy{
		AllowedExtensions: []string{".jpg", ".jpeg", ".png", ".webp", ".pdf", ".mp4", ".webm"},
		AllowedMIMETypes:  []string{"image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4", "video/webm"},
		ExtensionMIMETypes: map[string]string{
			".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm",
		},
		MaxImageBytes: MaxImageBytes, MaxImageSourceBytes: MaxImageSourceBytes, MaxDocumentBytes: MaxDocumentBytes, MaxVideoBytes: MaxVideoBytes, MaxObjectBytes: MaxObjectBytes, MaxMultipartBytes: MaxMultipartBytes,
	}
}

func NormalizeFilename(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" || len([]rune(value)) > MaxFilenameRunes || value != filepath.Base(value) || strings.ContainsAny(value, `/\\:`) {
		return "", ErrInvalidFilename
	}
	for _, r := range value {
		if unicode.IsControl(r) {
			return "", ErrInvalidFilename
		}
	}
	ext := strings.ToLower(filepath.Ext(value))
	if _, ok := extensionToMIME[ext]; !ok {
		return "", ErrInvalidFilename
	}
	if strings.TrimSpace(strings.TrimSuffix(value, ext)) == "" {
		return "", ErrInvalidFilename
	}
	return value, nil
}

func ValidateFilenameForMIME(value, mimeType string) (string, error) {
	value, err := NormalizeFilename(value)
	if err != nil {
		return "", err
	}
	if extensionToMIME[strings.ToLower(filepath.Ext(value))] != mimeType {
		return "", ErrExtensionMimeMismatch
	}
	return value, nil
}

func LimitForMIME(mimeType string) int64 {
	if strings.HasPrefix(mimeType, "image/") {
		return MaxImageBytes
	}
	if strings.HasPrefix(mimeType, "video/") {
		return MaxVideoBytes
	}
	return MaxDocumentBytes
}

func DetectMIME(data []byte) string {
	if len(data) >= 3 && data[0] == 0xff && data[1] == 0xd8 && data[2] == 0xff {
		return "image/jpeg"
	}
	if len(data) >= 8 && string(data[:8]) == "\x89PNG\r\n\x1a\n" {
		return "image/png"
	}
	if len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp"
	}
	if len(data) >= 5 && string(data[:5]) == "%PDF-" {
		return "application/pdf"
	}
	if len(data) >= 12 && string(data[4:8]) == "ftyp" {
		return "video/mp4"
	}
	if len(data) >= 8 && bytes.Equal(data[:4], []byte{0x1a, 0x45, 0xdf, 0xa3}) && bytes.Contains(bytes.ToLower(data), []byte("webm")) {
		return "video/webm"
	}
	return "application/octet-stream"
}

func IsAllowedMIME(mimeType string) bool {
	for _, allowed := range Policy().AllowedMIMETypes {
		if mimeType == allowed {
			return true
		}
	}
	return false
}

func validateText(value *string, max int, singleLine bool) error {
	if value == nil {
		return nil
	}
	if len([]rune(*value)) > max || (singleLine && strings.ContainsAny(*value, "\r\n")) {
		return ErrInvalidMetadata
	}
	for _, r := range *value {
		if unicode.IsControl(r) && (singleLine || (r != '\r' && r != '\n' && r != '\t')) {
			return ErrInvalidMetadata
		}
	}
	return nil
}

func ValidateMetadata(update MetadataUpdate) error {
	if err := validateText(update.Title, 255, true); err != nil {
		return err
	}
	if err := validateText(update.AltText, 255, true); err != nil {
		return err
	}
	return validateText(update.Caption, MaxMetadataRunes, false)
}

func NormalizeListFilter(filter ListFilter) (ListFilter, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 20
	}
	if filter.PageSize > 100 || len([]rune(filter.Query)) > 100 {
		return filter, ErrInvalidFilter
	}
	filter.Query = strings.TrimSpace(filter.Query)
	if filter.Kind == "" {
		filter.Kind = "all"
	}
	if filter.Kind != "all" && filter.Kind != "image" && filter.Kind != "document" && filter.Kind != "video" {
		return filter, ErrInvalidFilter
	}
	return filter, nil
}

func ValidateUsage(entityType, entityID, usageRole string, sortOrder int) error {
	if entityType != "news" && entityType != "announcement" && entityType != "knowledge_revision" && entityType != "faq_item" && entityType != "microlearning" {
		return ErrInvalidUsage
	}
	if usageRole != "inline" && usageRole != "featured" && usageRole != "attachment" {
		return ErrInvalidUsage
	}
	if entityID == "" || len(entityID) > 64 || sortOrder < 0 || sortOrder > 10_000 {
		return ErrInvalidUsage
	}
	return nil
}
