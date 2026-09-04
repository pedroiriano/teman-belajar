package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"teman-belajar-api/internal/adapters/minio"
	"teman-belajar-api/internal/adapters/moodle"
	searchadapter "teman-belajar-api/internal/adapters/search"
	auditcenterapplication "teman-belajar-api/internal/application/auditcenter"
	engagementapplication "teman-belajar-api/internal/application/engagement"
	integrationapplication "teman-belajar-api/internal/application/integration"
	learningpathapplication "teman-belajar-api/internal/application/learningpath"
	notificationapplication "teman-belajar-api/internal/application/notification"
	platformconfigapplication "teman-belajar-api/internal/application/platformconfig"
	searchapplication "teman-belajar-api/internal/application/search"
	"teman-belajar-api/internal/domain/analytics"
	"teman-belajar-api/internal/domain/dashboard"
	"teman-belajar-api/internal/domain/cms"
	"teman-belajar-api/internal/domain/discoverability"
	"teman-belajar-api/internal/domain/draft"
	"teman-belajar-api/internal/domain/faq"
	"teman-belajar-api/internal/domain/knowledge"
	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/domain/learningpath"
	"teman-belajar-api/internal/domain/media"
	"teman-belajar-api/internal/domain/mediagallery"
	"teman-belajar-api/internal/domain/microlearning"
	"teman-belajar-api/internal/domain/rbac"
	"teman-belajar-api/internal/domain/reviewnote"
	"teman-belajar-api/internal/domain/schedule"
	"teman-belajar-api/internal/domain/training"
	"teman-belajar-api/internal/domain/webinar"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/repository/postgres"
	"teman-belajar-api/internal/transport/http/handler"
	"teman-belajar-api/internal/transport/http/middleware"
)

func main() {
	ctx := context.Background()
	shutdown, err := observability.InitTracer(ctx, "teman-belajar-api")
	if err != nil {
		log.Printf("Failed to init tracer (non-critical): %v", err)
	} else {
		defer shutdown(ctx)
	}

	mux := http.NewServeMux()

	// Database Connection
	dbConnString := os.Getenv("DATABASE_URL")
	if dbConnString == "" {
		log.Fatal("Missing required environment variable: DATABASE_URL")
	}

	db, err := sql.Open("postgres", dbConnString)
	if err != nil {
		log.Fatalf("Failed to open db: %v", err)
	}
	defer db.Close()
	observability.InitDBMetrics(db, "portal")

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	log.Println("Database connection established")

	// Repositories & Services
	cmsRepo := postgres.NewCMSRepository(db)
	auditRepo := postgres.NewAuditRepository(db)
	auditCenterSvc := auditcenterapplication.NewService(auditRepo)
	mediaRepo := postgres.NewMediaRepository(db)
	mediaGalleryRepo := postgres.NewMediaGalleryRepository(db)
	mediaGallerySvc := mediagallery.NewService(mediaGalleryRepo, mediaRepo, auditRepo)
	platformConfigRepo := postgres.NewPlatformConfigRepository(db)
	platformConfigSvc := platformconfigapplication.NewService(platformConfigRepo, mediaRepo, strings.Split(os.Getenv("PLATFORM_CONFIG_EXTERNAL_HOST_ALLOWLIST"), ","))
	cmsSvc := cms.NewService(cmsRepo, auditRepo)

	knowledgeRepo := postgres.NewKnowledgeRepository(db)
	knowledgeSvc := knowledge.NewService(knowledgeRepo, auditRepo)
	hierarchySvc := knowledge.NewHierarchyService(knowledgeRepo, auditRepo)
	draftRetentionDays := 30
	if configured := strings.TrimSpace(os.Getenv("FORM_DRAFT_RETENTION_DAYS")); configured != "" {
		parsed, parseErr := strconv.Atoi(configured)
		if parseErr != nil || parsed < 1 || parsed > 365 {
			log.Fatal("FORM_DRAFT_RETENTION_DAYS must be an integer from 1 to 365")
		}
		draftRetentionDays = parsed
	}
	draftRepo := postgres.NewDraftRepository(db)
	draftSvc := draft.NewService(draftRepo, auditRepo, draftRetentionDays)
	engagementRepo := postgres.NewEngagementRepository(db)
	microlearningRepo := postgres.NewMicrolearningRepository(db)
	microlearningSvc := microlearning.NewService(microlearningRepo, auditRepo)
	engagementResolver := engagementapplication.NewTargetResolver(knowledgeRepo, microlearningRepo)
	discoveryRepo := postgres.NewDiscoverabilityRepository(db)
	discoverySvc := discoverability.NewService(discoveryRepo, auditRepo)
	faqRepo := postgres.NewFAQRepository(db)
	faqSvc := faq.NewService(faqRepo, auditRepo)
	notificationRepo := postgres.NewNotificationRepository(db)
	notificationSvc := notificationapplication.NewService(notificationRepo, auditRepo, 90)

	moodleToken := os.Getenv("TB_MOODLE_WEBSERVICE_TOKEN")
	moodleBaseURL := os.Getenv("MOODLE_INTERNAL_BASE_URL")
	moodlePublicBaseURL := os.Getenv("MOODLE_PUBLIC_BASE_URL")
	if moodleBaseURL == "" {
		moodleBaseURL = "http://moodle"
	}

	if moodleToken == "" {
		log.Fatal("Missing required environment variable: TB_MOODLE_WEBSERVICE_TOKEN")
	}
	if _, err := url.ParseRequestURI(moodleBaseURL); err != nil {
		log.Fatalf("Invalid MOODLE_INTERNAL_BASE_URL: %v", err)
	}
	if moodlePublicBaseURL == "" {
		log.Fatal("Missing required environment variable: MOODLE_PUBLIC_BASE_URL")
	}
	if _, err := url.ParseRequestURI(moodlePublicBaseURL); err != nil {
		log.Fatalf("Invalid MOODLE_PUBLIC_BASE_URL: %v", err)
	}

	moodleClient := moodle.NewClient(moodle.Config{
		BaseURL:       moodleBaseURL,
		PublicBaseURL: moodlePublicBaseURL,
		Token:         moodleToken,
		Timeout:       10 * time.Second,
	})
	learningSvc := learning.NewService(moodleClient)
	trainingRepo := postgres.NewTrainingRepository(db)
	trainingSvc := training.NewService(trainingRepo, moodleClient, auditRepo, moodlePublicBaseURL)

	// Handlers
	cmsHandler := handler.NewCMSHandler(cmsSvc, discoverySvc)
	knowledgeHandler := handler.NewKnowledgeHandler(knowledgeSvc, hierarchySvc, discoverySvc)
	hierarchyHandler := handler.NewKnowledgeHierarchyHandler(hierarchySvc)
	discoveryHandler := handler.NewDiscoverabilityHandler(discoverySvc)
	faqHandler := handler.NewFAQHandler(faqSvc)
	draftHandler := handler.NewDraftHandler(draftSvc)
	learningHandler := handler.NewLearningHandler(learningSvc)
	trainingHandler := handler.NewTrainingHandler(trainingSvc)
	microlearningHandler := handler.NewMicrolearningHandler(microlearningSvc)
	notificationHandler := handler.NewNotificationHandler(notificationSvc)
	webinarSvc := webinar.NewService(moodleClient, notificationSvc)
	webinarHandler := handler.NewWebinarHandler(webinarSvc)
	learningPathRepo := postgres.NewLearningPathRepository(db)
	learningPathSources := learningpathapplication.NewSourceAdapter(moodleClient, knowledgeRepo, microlearningRepo, webinarSvc, engagementRepo, moodlePublicBaseURL)
	learningPathSvc := learningpath.NewService(learningPathRepo, learningPathSources, auditRepo)
	learningPathHandler := handler.NewLearningPathHandler(learningPathSvc)

	// Media Storage & Services
	minioEndpoint := os.Getenv("MINIO_ENDPOINT")
	minioAccessKey := os.Getenv("MINIO_ACCESS_KEY")
	minioSecretKey := os.Getenv("MINIO_SECRET_KEY")
	minioBucket := os.Getenv("MINIO_BUCKET")
	minioUseSSL := os.Getenv("MINIO_USE_SSL") == "true"

	var mediaSvc *media.Service
	if minioEndpoint != "" {
		minioStorage, err := minio.NewStorage(minioEndpoint, minioAccessKey, minioSecretKey, minioUseSSL)
		if err != nil {
			log.Fatalf("Failed to initialize MinIO storage: %v", err)
		}

		if err := minioStorage.EnsureBucket(context.Background(), minioBucket); err != nil {
			log.Fatalf("Failed to ensure MinIO bucket %s: %v", minioBucket, err)
		}

		mediaSvc = media.NewService(mediaRepo, minioStorage, auditRepo, minioBucket, media.MaxObjectBytes)
	}

	var mediaHandler *handler.MediaHandler
	if mediaSvc != nil {
		mediaHandler = handler.NewMediaHandler(mediaSvc)
	}

	meiliURL := os.Getenv("MEILI_URL")
	meiliKey := os.Getenv("MEILI_SEARCH_KEY")
	meiliIndexName := os.Getenv("MEILI_INDEX_NAME")
	if rawQueryCapture := os.Getenv("SEARCH_CAPTURE_RAW_QUERY"); rawQueryCapture != "" && rawQueryCapture != "false" {
		log.Fatal("SEARCH_CAPTURE_RAW_QUERY must be false; raw query capture is disabled by policy")
	}
	var searchHandler *handler.SearchHandler
	var searchService *searchapplication.Service
	if meiliURL != "" {
		if _, err := url.ParseRequestURI(meiliURL); err != nil {
			log.Fatalf("Invalid MEILI_URL: %v", err)
		}
		if meiliKey == "" {
			log.Fatal("Missing required environment variable: MEILI_SEARCH_KEY")
		}
		if meiliIndexName == "" {
			log.Fatal("Missing required environment variable: MEILI_INDEX_NAME")
		}
		meiliClient := searchadapter.NewMeilisearchClient(meiliURL, meiliKey, meiliIndexName)
		searchService = searchapplication.NewService(meiliClient)
		searchHandler = handler.NewSearchHandler(searchService)
	}

	analyticsRepo := analytics.NewPostgresRepository(db)
	analyticsHandler := handler.NewAnalyticsHandler(analyticsRepo, moodleClient)

	dashboardRepo := postgres.NewDashboardRepository(db)
	dashboardSvc := dashboard.NewService(dashboardRepo)
	dashboardHandler := handler.NewDashboardHandler(dashboardSvc)

	scheduleRepo := postgres.NewScheduleRepository(db)
	compositePublisher := NewCompositeEntityPublisher(db)
	scheduleSvc := schedule.NewService(scheduleRepo, compositePublisher)
	scheduleHandler := handler.NewScheduleHandler(scheduleSvc)

	rbacRepo := postgres.NewRBACRepository(db)
	rbacSvc := rbac.NewService(rbacRepo)
	rbacHandler := handler.NewRBACHandler(rbacSvc)

	reviewNoteRepo := postgres.NewReviewNoteRepository(db)
	reviewNoteSvc := reviewnote.NewService(reviewNoteRepo)
	reviewNoteHandler := handler.NewReviewNoteHandler(reviewNoteSvc)

	engagementService := engagementapplication.NewService(engagementRepo, engagementResolver, searchService)
	engagementHandler := handler.NewEngagementHandler(engagementService)

	issuerURL := os.Getenv("KEYCLOAK_ISSUER_URL")
	if issuerURL == "" {
		log.Fatal("Missing required environment variable: KEYCLOAK_ISSUER_URL")
	}
	audience := os.Getenv("KEYCLOAK_AUDIENCE")
	if audience == "" {
		audience = "teman-belajar-api"
	}

	log.Printf("Initializing OIDC Verifier for issuer %s", issuerURL)
	verifier, err := middleware.InitVerifier(context.Background(), issuerURL, audience)
	if err != nil {
		log.Fatalf("Failed to initialize OIDC verifier: %v", err)
	}

	authConfig := middleware.AuthConfig{
		IssuerURL: issuerURL,
		Audience:  audience,
	}

	authMiddleware := middleware.AuthMiddleware(verifier, authConfig)
	adminAuthMiddleware := middleware.AuthMiddleware(verifier, middleware.AuthConfig{
		IssuerURL: issuerURL,
		Audience:  audience,
		RequiredRoles: []string{
			"Portal Administrator",
			"Content Editor",
			"Reviewer",
		},
	})
	integrationHealthSvc := buildIntegrationHealthService(db, integrationHealthConfig{
		MoodleURL: moodleBaseURL, KeycloakIssuerURL: issuerURL, MeilisearchURL: meiliURL,
		RedisURL: os.Getenv("REDIS_URL"), MinioEndpoint: minioEndpoint, MinioUseSSL: minioUseSSL,
		PrometheusURL:      envOrDefault("PROMETHEUS_INTERNAL_URL", "http://prometheus:9090"),
		GrafanaURL:         envOrDefault("GRAFANA_INTERNAL_URL", "http://grafana:3000"),
		OTelCollectorURL:   envOrDefault("OTEL_HEALTH_INTERNAL_URL", "http://otel-collector:13133"),
		LokiURL:            envOrDefault("LOKI_INTERNAL_URL", "http://loki:3100"),
		TempoURL:           envOrDefault("TEMPO_INTERNAL_URL", "http://tempo:3200"),
		SearchWorkerURL:    envOrDefault("SEARCH_WORKER_HEALTH_URL", "http://search-worker:8081"),
		AnalyticsWorkerURL: envOrDefault("ANALYTICS_WORKER_HEALTH_URL", "http://analytics-worker:8081"),
	})
	integrationHealthHandler := handler.NewIntegrationHealthHandler(integrationHealthSvc, auditRepo)
	auditCenterHandler := handler.NewAuditCenterHandler(auditCenterSvc, auditRepo)
	platformConfigHandler := handler.NewPlatformConfigHandler(platformConfigSvc, auditRepo)
	mediaGalleryHandler := handler.NewMediaGalleryHandler(mediaGallerySvc, auditRepo)

	mux.HandleFunc("/api/v1/health", handler.HealthCheck)
	mux.Handle("GET /api/v1/platform-configuration", http.HandlerFunc(platformConfigHandler.Public))
	mux.Handle("GET /api/v1/admin/integration-health", authMiddleware(http.HandlerFunc(integrationHealthHandler.Summary)))
	mux.Handle("GET /api/v1/admin/audit-events", authMiddleware(http.HandlerFunc(auditCenterHandler.List)))
	mux.Handle("GET /api/v1/admin/audit-events/export", authMiddleware(http.HandlerFunc(auditCenterHandler.Export)))
	mux.Handle("GET /api/v1/admin/audit-events/{id}", authMiddleware(http.HandlerFunc(auditCenterHandler.Detail)))
	mux.Handle("GET /api/v1/admin/platform-configuration", authMiddleware(http.HandlerFunc(platformConfigHandler.State)))
	mux.Handle("GET /api/v1/admin/platform-configuration/preview", authMiddleware(http.HandlerFunc(platformConfigHandler.Preview)))
	mux.Handle("PUT /api/v1/admin/platform-configuration/draft", authMiddleware(http.HandlerFunc(platformConfigHandler.SaveDraft)))
	mux.Handle("POST /api/v1/admin/platform-configuration/publish", authMiddleware(http.HandlerFunc(platformConfigHandler.Publish)))
	mux.Handle("POST /api/v1/admin/platform-configuration/rollback", authMiddleware(http.HandlerFunc(platformConfigHandler.Rollback)))
	mux.HandleFunc("GET /api/v1/media-collections", mediaGalleryHandler.PublicList)
	mux.HandleFunc("GET /api/v1/media-collections/{slug}", mediaGalleryHandler.PublicDetail)
	mux.Handle("GET /api/v1/admin/media-collections", adminAuthMiddleware(http.HandlerFunc(mediaGalleryHandler.AdminList)))
	mux.Handle("POST /api/v1/admin/media-collections", adminAuthMiddleware(http.HandlerFunc(mediaGalleryHandler.Create)))
	mux.Handle("GET /api/v1/admin/media-collections/{id}", adminAuthMiddleware(http.HandlerFunc(mediaGalleryHandler.AdminGet)))
	mux.Handle("PATCH /api/v1/admin/media-collections/{id}", adminAuthMiddleware(http.HandlerFunc(mediaGalleryHandler.Update)))
	mux.Handle("POST /api/v1/admin/media-collections/{id}/transition", adminAuthMiddleware(http.HandlerFunc(mediaGalleryHandler.Transition)))
	// Analytics endpoints
	mux.Handle("POST /api/v1/analytics/events", http.HandlerFunc(analyticsHandler.HandlePublicIngest))
	mux.Handle("POST /api/v1/internal/analytics/events", http.HandlerFunc(analyticsHandler.HandleInternalIngest))
	mux.Handle("GET /api/v1/admin/analytics/statistics", adminAuthMiddleware(http.HandlerFunc(analyticsHandler.HandleGetStatistics)))
	mux.Handle("GET /api/v1/admin/dashboard/summary", adminAuthMiddleware(http.HandlerFunc(dashboardHandler.GetSummary)))
	mux.Handle("GET /api/v1/admin/workflow", adminAuthMiddleware(http.HandlerFunc(dashboardHandler.GetWorkflow)))
	mux.Handle("GET /api/v1/admin/schedules", adminAuthMiddleware(http.HandlerFunc(scheduleHandler.List)))
	mux.Handle("POST /api/v1/admin/schedules", adminAuthMiddleware(http.HandlerFunc(scheduleHandler.Create)))
	mux.Handle("POST /api/v1/admin/schedules/{id}/cancel", adminAuthMiddleware(http.HandlerFunc(scheduleHandler.Cancel)))
	mux.Handle("GET /api/v1/admin/rbac/roles", adminAuthMiddleware(http.HandlerFunc(rbacHandler.List)))
	mux.Handle("GET /api/v1/admin/rbac/roles/{id}", adminAuthMiddleware(http.HandlerFunc(rbacHandler.Get)))
	mux.Handle("PUT /api/v1/admin/rbac/roles/{id}", adminAuthMiddleware(http.HandlerFunc(rbacHandler.Update)))
	mux.Handle("POST /api/v1/admin/rbac/roles", adminAuthMiddleware(http.HandlerFunc(rbacHandler.Create)))
	mux.Handle("DELETE /api/v1/admin/rbac/roles/{id}", adminAuthMiddleware(http.HandlerFunc(rbacHandler.Delete)))
	mux.Handle("GET /api/v1/admin/review-notes/{entityType}/{entityId}", adminAuthMiddleware(http.HandlerFunc(reviewNoteHandler.List)))
	mux.Handle("POST /api/v1/admin/review-notes", adminAuthMiddleware(http.HandlerFunc(reviewNoteHandler.Create)))
	mux.Handle("/metrics", promhttp.Handler())

	// Public CMS Endpoints
	mux.HandleFunc("/api/v1/news", cmsHandler.ListPublicNews)
	mux.HandleFunc("/api/v1/news/", func(w http.ResponseWriter, r *http.Request) {
		// Basic router
		if r.URL.Path == "/api/v1/news" || r.URL.Path == "/api/v1/news/" {
			cmsHandler.ListPublicNews(w, r)
			return
		}
		cmsHandler.GetPublicNews(w, r)
	})
	mux.HandleFunc("/api/v1/announcements", cmsHandler.ListActiveAnnouncements)
	mux.HandleFunc("GET /api/v1/announcements/{slug}", cmsHandler.GetPublicAnnouncement)
	mux.HandleFunc("GET /api/v1/faqs", faqHandler.PublicList)
	mux.HandleFunc("GET /api/v1/training-programs", trainingHandler.PublicList)
	mux.HandleFunc("GET /api/v1/training-programs/{slug}", trainingHandler.PublicDetail)
	mux.HandleFunc("GET /api/v1/learning-paths", learningPathHandler.PublicList)
	mux.HandleFunc("GET /api/v1/learning-paths/{slug}", learningPathHandler.PublicDetail)
	mux.HandleFunc("GET /api/v1/microlearning", microlearningHandler.PublicList)
	mux.HandleFunc("GET /api/v1/microlearning/{slug}", microlearningHandler.PublicDetail)
	mux.HandleFunc("GET /api/v1/discovery/sitemap", discoveryHandler.Sitemap)
	mux.HandleFunc("GET /api/v1/discovery/{kind}/{slug}", discoveryHandler.Landing)

	if searchHandler != nil {
		mux.HandleFunc("GET /api/v1/search", searchHandler.Search)
	}

	// Protected endpoints
	mux.Handle("/api/v1/me", authMiddleware(http.HandlerFunc(handler.GetMe)))
	mux.Handle("GET /api/v1/me/bookmarks", authMiddleware(http.HandlerFunc(engagementHandler.ListBookmarks)))
	mux.Handle("PUT /api/v1/me/bookmarks/{targetType}/{targetId}", authMiddleware(http.HandlerFunc(engagementHandler.Bookmark)))
	mux.Handle("DELETE /api/v1/me/bookmarks/{targetType}/{targetId}", authMiddleware(http.HandlerFunc(engagementHandler.Bookmark)))
	mux.Handle("GET /api/v1/me/ratings/{targetType}/{targetId}", authMiddleware(http.HandlerFunc(engagementHandler.Rating)))
	mux.Handle("PUT /api/v1/me/ratings/{targetType}/{targetId}", authMiddleware(http.HandlerFunc(engagementHandler.Rating)))
	mux.Handle("DELETE /api/v1/me/ratings/{targetType}/{targetId}", authMiddleware(http.HandlerFunc(engagementHandler.Rating)))
	mux.Handle("GET /api/v1/me/recent-views", authMiddleware(http.HandlerFunc(engagementHandler.ListRecentViews)))
	mux.Handle("PUT /api/v1/me/recent-views/{targetType}/{targetId}", authMiddleware(http.HandlerFunc(engagementHandler.RecentView)))
	mux.Handle("GET /api/v1/me/recommendations", authMiddleware(http.HandlerFunc(engagementHandler.Recommendations)))
	mux.Handle("GET /api/v1/me/notifications", authMiddleware(http.HandlerFunc(notificationHandler.List)))
	mux.Handle("GET /api/v1/me/notifications/summary", authMiddleware(http.HandlerFunc(notificationHandler.Summary)))
	mux.Handle("PATCH /api/v1/me/notifications/{id}/read", authMiddleware(http.HandlerFunc(notificationHandler.MarkRead)))
	mux.Handle("POST /api/v1/me/notifications/read-all", authMiddleware(http.HandlerFunc(notificationHandler.MarkAllRead)))
	mux.Handle("GET /api/v1/me/notification-preferences", authMiddleware(http.HandlerFunc(notificationHandler.Preferences)))
	mux.Handle("PUT /api/v1/me/notification-preferences/{eventType}", authMiddleware(http.HandlerFunc(notificationHandler.SetPreference)))
	mux.HandleFunc("GET /api/v1/ratings/{targetType}/{targetId}", engagementHandler.RatingSummary)

	// Learning endpoints
	mux.Handle("GET /api/v1/learning/courses", authMiddleware(http.HandlerFunc(learningHandler.ListCourses)))
	mux.Handle("GET /api/v1/learning/me", authMiddleware(http.HandlerFunc(learningHandler.GetMe)))
	mux.Handle("GET /api/v1/learning/me/courses", authMiddleware(http.HandlerFunc(learningHandler.ListMyCourses)))
	mux.Handle("GET /api/v1/learning/me/courses/{courseId}/completion", authMiddleware(http.HandlerFunc(learningHandler.GetMyCourseCompletion)))
	mux.Handle("GET /api/v1/learning/me/courses/{courseId}/grades", authMiddleware(http.HandlerFunc(learningHandler.GetMyCourseGrades)))
	mux.Handle("GET /api/v1/learning/me/training-programs/{slug}", authMiddleware(http.HandlerFunc(trainingHandler.MyProgress)))
	mux.Handle("GET /api/v1/learning/me/learning-paths/{slug}", authMiddleware(http.HandlerFunc(learningPathHandler.Progress)))
	mux.Handle("GET /api/v1/webinars", authMiddleware(http.HandlerFunc(webinarHandler.List)))
	mux.Handle("GET /api/v1/webinars/{id}", authMiddleware(http.HandlerFunc(webinarHandler.Get)))
	mux.Handle("POST /api/v1/webinars/{id}/registrations", authMiddleware(http.HandlerFunc(webinarHandler.Register)))
	mux.Handle("DELETE /api/v1/webinars/{id}/registrations", authMiddleware(http.HandlerFunc(webinarHandler.Cancel)))
	mux.Handle("GET /api/v1/me/microlearning/{id}/progress", authMiddleware(http.HandlerFunc(microlearningHandler.Progress)))
	mux.Handle("PUT /api/v1/me/microlearning/{id}/progress", authMiddleware(http.HandlerFunc(microlearningHandler.Progress)))

	// Admin CMS Endpoints
	mux.Handle("/api/v1/admin/news", adminAuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			cmsHandler.ListAdminNews(w, r)
			return
		}
		cmsHandler.CreateNews(w, r)
	})))
	mux.Handle("/api/v1/admin/news/", adminAuthMiddleware(http.HandlerFunc(cmsHandler.TransitionNews)))
	mux.Handle("PATCH /api/v1/admin/news/{id}", adminAuthMiddleware(http.HandlerFunc(cmsHandler.UpdateNews)))
	mux.Handle("/api/v1/admin/announcements", adminAuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			cmsHandler.ListAdminAnnouncements(w, r)
			return
		}
		cmsHandler.CreateAnnouncement(w, r)
	})))
	mux.Handle("/api/v1/admin/announcements/", adminAuthMiddleware(http.HandlerFunc(cmsHandler.TransitionAnnouncement)))
	mux.Handle("PATCH /api/v1/admin/announcements/{id}", adminAuthMiddleware(http.HandlerFunc(cmsHandler.UpdateAnnouncement)))
	mux.Handle("GET /api/v1/admin/taxonomy/{kind}", adminAuthMiddleware(http.HandlerFunc(discoveryHandler.AdminTerms)))
	mux.Handle("POST /api/v1/admin/taxonomy/{kind}", adminAuthMiddleware(http.HandlerFunc(discoveryHandler.AdminTerms)))
	mux.Handle("POST /api/v1/admin/taxonomy/{kind}/{id}/archive", adminAuthMiddleware(http.HandlerFunc(discoveryHandler.ArchiveTerm)))
	mux.Handle("GET /api/v1/admin/discoverability/{contentType}/{contentId}", adminAuthMiddleware(http.HandlerFunc(discoveryHandler.AdminProfile)))
	mux.Handle("PUT /api/v1/admin/discoverability/{contentType}/{contentId}", adminAuthMiddleware(http.HandlerFunc(discoveryHandler.AdminProfile)))
	mux.Handle("GET /api/v1/admin/faqs/categories", adminAuthMiddleware(http.HandlerFunc(faqHandler.Categories)))
	mux.Handle("POST /api/v1/admin/faqs/categories", adminAuthMiddleware(http.HandlerFunc(faqHandler.Categories)))
	mux.Handle("POST /api/v1/admin/faqs/categories/{id}/archive", adminAuthMiddleware(http.HandlerFunc(faqHandler.ArchiveCategory)))
	mux.Handle("GET /api/v1/admin/faqs/items", adminAuthMiddleware(http.HandlerFunc(faqHandler.Items)))
	mux.Handle("POST /api/v1/admin/faqs/items", adminAuthMiddleware(http.HandlerFunc(faqHandler.Items)))
	mux.Handle("GET /api/v1/admin/faqs/items/{id}", adminAuthMiddleware(http.HandlerFunc(faqHandler.GetItem)))
	mux.Handle("PATCH /api/v1/admin/faqs/items/{id}", adminAuthMiddleware(http.HandlerFunc(faqHandler.UpdateItem)))
	mux.Handle("POST /api/v1/admin/faqs/items/{id}/transition", adminAuthMiddleware(http.HandlerFunc(faqHandler.Transition)))
	mux.Handle("GET /api/v1/admin/training-programs", adminAuthMiddleware(http.HandlerFunc(trainingHandler.AdminList)))
	mux.Handle("POST /api/v1/admin/training-programs", adminAuthMiddleware(http.HandlerFunc(trainingHandler.AdminCreate)))
	mux.Handle("GET /api/v1/admin/training-programs/course-options", adminAuthMiddleware(http.HandlerFunc(trainingHandler.CourseOptions)))
	mux.Handle("GET /api/v1/admin/training-programs/{id}", adminAuthMiddleware(http.HandlerFunc(trainingHandler.AdminGet)))
	mux.Handle("PATCH /api/v1/admin/training-programs/{id}", adminAuthMiddleware(http.HandlerFunc(trainingHandler.AdminUpdate)))
	mux.Handle("POST /api/v1/admin/training-programs/{id}/transition", adminAuthMiddleware(http.HandlerFunc(trainingHandler.AdminTransition)))
	mux.Handle("GET /api/v1/admin/learning-paths", adminAuthMiddleware(http.HandlerFunc(learningPathHandler.AdminList)))
	mux.Handle("POST /api/v1/admin/learning-paths", adminAuthMiddleware(http.HandlerFunc(learningPathHandler.AdminCreate)))
	mux.Handle("GET /api/v1/admin/learning-paths/options", adminAuthMiddleware(http.HandlerFunc(learningPathHandler.AdminOptions)))
	mux.Handle("GET /api/v1/admin/learning-paths/{id}", adminAuthMiddleware(http.HandlerFunc(learningPathHandler.AdminGet)))
	mux.Handle("PATCH /api/v1/admin/learning-paths/{id}", adminAuthMiddleware(http.HandlerFunc(learningPathHandler.AdminUpdate)))
	mux.Handle("POST /api/v1/admin/learning-paths/{id}/transition", adminAuthMiddleware(http.HandlerFunc(learningPathHandler.AdminTransition)))
	mux.Handle("POST /api/v1/admin/learning-paths/{id}/revisions", adminAuthMiddleware(http.HandlerFunc(learningPathHandler.AdminRevision)))
	mux.Handle("GET /api/v1/admin/microlearning", adminAuthMiddleware(http.HandlerFunc(microlearningHandler.AdminList)))
	mux.Handle("POST /api/v1/admin/microlearning", adminAuthMiddleware(http.HandlerFunc(microlearningHandler.AdminCreate)))
	mux.Handle("GET /api/v1/admin/microlearning/{id}", adminAuthMiddleware(http.HandlerFunc(microlearningHandler.AdminGet)))
	mux.Handle("PATCH /api/v1/admin/microlearning/{id}", adminAuthMiddleware(http.HandlerFunc(microlearningHandler.AdminUpdate)))
	mux.Handle("POST /api/v1/admin/microlearning/{id}/transition", adminAuthMiddleware(http.HandlerFunc(microlearningHandler.AdminTransition)))

	mux.HandleFunc("GET /api/v1/knowledge", knowledgeHandler.ListPublicArticles)
	mux.HandleFunc("GET /api/v1/knowledge/tree", hierarchyHandler.PublicTree)
	mux.HandleFunc("GET /api/v1/knowledge/{slug}", knowledgeHandler.GetPublicArticle)

	if mediaHandler != nil {
		mux.HandleFunc("GET /api/v1/media/{id}/content", mediaHandler.GetMediaContent)

		// Admin Media Endpoints
		mux.Handle("GET /api/v1/admin/media", adminAuthMiddleware(http.HandlerFunc(mediaHandler.ListAdminMedia)))
		mux.Handle("POST /api/v1/admin/media", adminAuthMiddleware(http.HandlerFunc(mediaHandler.CreateMedia)))
		mux.Handle("GET /api/v1/admin/media/policy", adminAuthMiddleware(http.HandlerFunc(mediaHandler.GetMediaPolicy)))
		mux.Handle("GET /api/v1/admin/media/{id}", adminAuthMiddleware(http.HandlerFunc(mediaHandler.GetAdminMedia)))
		mux.Handle("GET /api/v1/admin/media/{id}/content", adminAuthMiddleware(http.HandlerFunc(mediaHandler.GetAdminMediaContent)))
		mux.Handle("PATCH /api/v1/admin/media/{id}", adminAuthMiddleware(http.HandlerFunc(mediaHandler.UpdateMediaMetadata)))
		mux.Handle("POST /api/v1/admin/media/{id}/archive", adminAuthMiddleware(http.HandlerFunc(mediaHandler.ArchiveMedia)))

		mux.Handle("POST /api/v1/admin/media/{id}/attach", adminAuthMiddleware(http.HandlerFunc(mediaHandler.AttachMediaUsage)))
		mux.Handle("POST /api/v1/admin/media/{id}/detach", adminAuthMiddleware(http.HandlerFunc(mediaHandler.DetachMediaUsage)))
	}

	mux.Handle("GET /api/v1/admin/knowledge", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.ListAdminArticles)))
	mux.Handle("POST /api/v1/admin/knowledge", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.CreateArticle)))
	mux.Handle("GET /api/v1/admin/knowledge-hierarchy/nodes", adminAuthMiddleware(http.HandlerFunc(hierarchyHandler.AdminTree)))
	mux.Handle("POST /api/v1/admin/knowledge-hierarchy/nodes", adminAuthMiddleware(http.HandlerFunc(hierarchyHandler.CreateNode)))
	mux.Handle("PATCH /api/v1/admin/knowledge-hierarchy/nodes/{id}", adminAuthMiddleware(http.HandlerFunc(hierarchyHandler.UpdateNode)))
	mux.Handle("POST /api/v1/admin/knowledge-hierarchy/nodes/{id}/move", adminAuthMiddleware(http.HandlerFunc(hierarchyHandler.MoveNode)))
	mux.Handle("POST /api/v1/admin/knowledge-hierarchy/nodes/{id}/archive", adminAuthMiddleware(http.HandlerFunc(hierarchyHandler.ArchiveNode)))
	mux.Handle("POST /api/v1/admin/knowledge-hierarchy/nodes/reorder", adminAuthMiddleware(http.HandlerFunc(hierarchyHandler.ReorderNodes)))
	mux.Handle("GET /api/v1/admin/knowledge/{id}", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.GetAdminArticle)))
	mux.Handle("PUT /api/v1/admin/knowledge/{id}/primary-node", adminAuthMiddleware(http.HandlerFunc(hierarchyHandler.AssignArticle)))
	mux.Handle("POST /api/v1/admin/knowledge/{id}/revisions", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.CreateRevision)))
	mux.Handle("GET /api/v1/admin/knowledge/{id}/revisions", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.ListRevisions)))
	mux.Handle("POST /api/v1/admin/knowledge/{id}/transition", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.TransitionStatus)))

	// Owner-isolated authoring drafts (TASK-011A).
	mux.Handle("GET /api/v1/admin/form-drafts", adminAuthMiddleware(http.HandlerFunc(draftHandler.List)))
	mux.Handle("GET /api/v1/admin/form-drafts/{draftKey}", adminAuthMiddleware(http.HandlerFunc(draftHandler.Get)))
	mux.Handle("PUT /api/v1/admin/form-drafts/{draftKey}", adminAuthMiddleware(http.HandlerFunc(draftHandler.Save)))
	mux.Handle("DELETE /api/v1/admin/form-drafts/{draftKey}", adminAuthMiddleware(http.HandlerFunc(draftHandler.Delete)))
	mux.Handle("POST /api/v1/admin/form-drafts/{draftKey}/recovered", adminAuthMiddleware(http.HandlerFunc(draftHandler.RecordRecovery)))

	// Moodle Event Inbox (TASK-011)
	eventIngestSecret := os.Getenv("TB_MOODLE_EVENT_INGEST_SECRET")
	if eventIngestSecret == "" || strings.HasPrefix(eventIngestSecret, "CHANGE_ME") {
		log.Fatal("Missing or placeholder TB_MOODLE_EVENT_INGEST_SECRET — event ingest endpoint disabled for security")
	}
	integrationRepo := postgres.NewIntegrationRepository(db)
	eventService := integrationapplication.NewEventService(integrationRepo, auditRepo)
	integrationHandler := handler.NewIntegrationHandler(eventService)
	hmacAuth := middleware.HMACAuthMiddleware(eventIngestSecret, auditRepo)
	mux.Handle("POST /api/v1/internal/moodle/events", hmacAuth(http.HandlerFunc(integrationHandler.HandleMoodleEventIngest)))

	// Start background event processor
	processorCtx, processorCancel := context.WithCancel(ctx)
	var processorWg sync.WaitGroup
	processor := integrationapplication.NewEventProcessor(integrationRepo, integrationapplication.DefaultProcessorConfig())
	processorWg.Add(1)
	go func() {
		defer processorWg.Done()
		processor.Run(processorCtx)
	}()
	processorWg.Add(1)
	go func() {
		defer processorWg.Done()
		runAuditRetention(processorCtx, auditCenterSvc)
	}()
	processorWg.Add(1)
	go func() {
		defer processorWg.Done()
		runSchedulePublisher(processorCtx, scheduleSvc)
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting teman-belajar-api on :%s", port)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           observability.MetricsMiddleware(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Graceful shutdown on SIGINT/SIGTERM
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigCh
		log.Printf("Received signal %v, shutting down...", sig)
		processorCancel()
		processorWg.Wait()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
	log.Println("Server stopped gracefully")
}

func envOrDefault(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}
