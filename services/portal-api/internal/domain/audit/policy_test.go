package audit

import "testing"

func TestMaskIPAndSanitizeSensitiveFields(t *testing.T) {
	if got := MaskIP("192.0.2.77:443"); got != "192.0.2.0/24" {
		t.Fatalf("IPv4 mask=%q", got)
	}
	if got := MaskIP("[2001:db8:abcd:12::1]:443"); got != "2001:db8:abcd::/48" {
		t.Fatalf("IPv6 mask=%q", got)
	}
	event := SanitizeEvent(AuditEvent{
		Action: "VIEWED", TargetType: "external", TargetID: "https://example.test/?token=secret",
		Result: "SUCCESS", TraceID: "unsafe correlation value!", IPMasked: "192.0.2.77/24",
		Metadata: map[string]string{"export_row_count": "12", "payload": "secret", "retention_days": "90"},
	})
	if event.TargetID != "[redacted]" || event.TraceID != "" || event.IPMasked != "" {
		t.Fatalf("sensitive values survived: %#v", event)
	}
	if len(event.Metadata) != 1 || event.Metadata["export_row_count"] != "12" {
		t.Fatalf("metadata allowlist failed: %#v", event.Metadata)
	}
}
