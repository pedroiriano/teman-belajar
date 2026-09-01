package platformconfig

import (
	"strings"
	"testing"
)

func TestDefaultConfigurationIsValid(t *testing.T) {
	if err := Validate(Default(), nil); err != nil {
		t.Fatalf("default config: %v", err)
	}
}

func TestDecodeRejectsUnknownAndOversizedPayloads(t *testing.T) {
	if _, err := Decode(strings.NewReader(`{"identity":{"tagline":"A","prototype":"x"}}`)); err == nil {
		t.Fatal("unknown nested key must be rejected")
	}
	if _, err := Decode(strings.NewReader(strings.Repeat("x", MaxPayloadBytes+1))); err == nil {
		t.Fatal("oversized payload must be rejected")
	}
}

func TestValidateRejectsUnsafeInputsAndInactiveFeatures(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(*Config)
	}{
		{"javascript URL", func(config *Config) { config.Navigation[0].Href = "javascript:alert(1)" }},
		{"protocol relative URL", func(config *Config) { config.Navigation[0].Href = "//evil.example/path" }},
		{"unknown external host", func(config *Config) { config.Navigation[0].Href = "https://evil.example/path" }},
		{"secret value", func(config *Config) { config.Footer.Summary = "token=do-not-store" }},
		{"arbitrary markup", func(config *Config) { config.Banner.Body = "<script>alert(1)</script>" }},
		{"arbitrary CSS", func(config *Config) { config.Banner.Body = "body { color: red }" }},
		{"inactive route", func(config *Config) { config.Navigation[0].Href = "/webinars" }},
		{"operational route", func(config *Config) { config.Navigation[0].Href = "/api/auth/federated-logout" }},
		{"inactive feature", func(config *Config) {
			config.Features = append(config.Features, FeaturePresentation{Key: "webinar", Label: "Webinar", Visible: true})
		}},
	}
	for _, test := range cases {
		t.Run(test.name, func(t *testing.T) {
			config := Default()
			test.mutate(&config)
			if err := Validate(config, nil); err == nil {
				t.Fatal("unsafe configuration accepted")
			}
		})
	}
}

func TestValidateAllowsHTTPSOnServerAllowlist(t *testing.T) {
	config := Default()
	config.Navigation[0].Href = "https://learning.example.org/catalogue"
	if err := Validate(config, []string{"learning.example.org"}); err != nil {
		t.Fatalf("allowlisted URL rejected: %v", err)
	}
}

func TestApplyCurrentDefaultsAddsMediaGalleryWithoutOverridingExplicitVisibility(t *testing.T) {
	legacy := Default()
	legacy.Navigation = legacy.Navigation[:2]
	legacy.Features = legacy.Features[:2]
	current := ApplyCurrentDefaults(legacy)
	findNavigation := func(config Config, href string) *NavigationItem {
		for i := range config.Navigation {
			if config.Navigation[i].Href == href {
				return &config.Navigation[i]
			}
		}
		return nil
	}
	findFeature := func(config Config, key string) *FeaturePresentation {
		for i := range config.Features {
			if config.Features[i].Key == key {
				return &config.Features[i]
			}
		}
		return nil
	}
	galleryNavigation, pathNavigation := findNavigation(current, "/media-gallery"), findNavigation(current, "/learning-paths")
	galleryFeature, pathFeature := findFeature(current, "media_gallery"), findFeature(current, "learning_paths")
	if galleryNavigation == nil || galleryFeature == nil || pathNavigation == nil || pathFeature == nil {
		t.Fatal("legacy configuration was not extended")
	}
	galleryNavigation.Visible = false
	pathNavigation.Visible = false
	galleryFeature.Visible = false
	pathFeature.Visible = false
	explicit := ApplyCurrentDefaults(current)
	if findNavigation(explicit, "/media-gallery").Visible || findNavigation(explicit, "/learning-paths").Visible || findFeature(explicit, "media_gallery").Visible || findFeature(explicit, "learning_paths").Visible {
		t.Fatal("explicit hidden presentation was overridden")
	}
}
