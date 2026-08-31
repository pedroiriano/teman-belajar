package audit

import (
	"net"
	"regexp"
	"strings"
)

var correlationPattern = regexp.MustCompile(`^[A-Za-z0-9._:-]{1,64}$`)
var numericMetadataPattern = regexp.MustCompile(`^[0-9]{1,5}$`)

var allowedMetadata = map[string]struct{}{
	"export_row_count": {},
	"filter_count":     {},
	"retention_days":   {},
}

var sensitiveFragments = []string{
	"authorization", "bearer ", "client_secret", "cookie", "password",
	"passcode", "refresh_token", "access_token", "token=", "secret=",
	"http://", "https://", "stack trace", "panic:",
}

func SanitizeEvent(event AuditEvent) AuditEvent {
	event.Action = safeText(event.Action, 100, "UNKNOWN_EVENT")
	event.TargetType = safeText(event.TargetType, 100, "unknown")
	event.Module = safeText(event.Module, 100, event.TargetType)
	event.TargetID = safeText(event.TargetID, 255, "[redacted]")
	event.Result = safeText(event.Result, 50, "UNKNOWN")
	if !correlationPattern.MatchString(event.TraceID) {
		event.TraceID = ""
	}
	if !isMaskedIP(event.IPMasked) {
		event.IPMasked = ""
	}
	event.Metadata = SanitizeMetadata(event.Metadata)
	return event
}

func SafeFilterValue(value string) bool {
	if strings.ContainsAny(value, "\r\n") {
		return false
	}
	lower := strings.ToLower(value)
	for _, fragment := range sensitiveFragments {
		if strings.Contains(lower, fragment) {
			return false
		}
	}
	return true
}

func ValidCorrelationID(value string) bool {
	return value == "" || correlationPattern.MatchString(value)
}

func SanitizeMetadata(input map[string]string) map[string]string {
	if len(input) == 0 {
		return nil
	}
	output := make(map[string]string, len(input))
	for key, value := range input {
		if _, ok := allowedMetadata[key]; !ok {
			continue
		}
		value = strings.TrimSpace(value)
		if !numericMetadataPattern.MatchString(value) || (key == "retention_days" && value != "365") {
			continue
		}
		output[key] = value
	}
	if len(output) == 0 {
		return nil
	}
	return output
}

func MaskIP(remoteAddress string) string {
	host := strings.TrimSpace(remoteAddress)
	if parsedHost, _, err := net.SplitHostPort(host); err == nil {
		host = parsedHost
	}
	ip := net.ParseIP(strings.Trim(host, "[]"))
	if ip == nil {
		return ""
	}
	if ipv4 := ip.To4(); ipv4 != nil {
		return net.IPv4(ipv4[0], ipv4[1], ipv4[2], 0).String() + "/24"
	}
	masked := make(net.IP, net.IPv6len)
	copy(masked[:6], ip.To16()[:6])
	return masked.String() + "/48"
}

func safeText(value string, maxLength int, fallback string) string {
	value = strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(value, "\r", " "), "\n", " "))
	lower := strings.ToLower(value)
	for _, fragment := range sensitiveFragments {
		if strings.Contains(lower, fragment) {
			return fallback
		}
	}
	if value == "" {
		return fallback
	}
	runes := []rune(value)
	if len(runes) > maxLength {
		value = string(runes[:maxLength])
	}
	return value
}

func isMaskedIP(value string) bool {
	if value == "" {
		return true
	}
	parsed, network, err := net.ParseCIDR(value)
	if err != nil {
		return false
	}
	ones, bits := network.Mask.Size()
	return parsed.Equal(network.IP) && ((bits == 32 && ones == 24) || (bits == 128 && ones == 48))
}
