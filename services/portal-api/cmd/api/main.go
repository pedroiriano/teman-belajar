package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	_ "github.com/lib/pq"

	"teman-belajar-api/internal/adapters/minio"
	"teman-belajar-api/internal/adapters/moodle"
	searchadapter "teman-belajar-api/internal/adapters/search"
	engagementapplication "teman-belajar-api/internal/application/engagement"
	searchapplication "teman-belajar-api/internal/application/search"
	"teman-belajar-api/internal/domain/cms"
	"teman-belajar-api/internal/domain/knowledge"
	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/domain/media"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/domain/analytics"
	"teman-belajar-api/internal/repository/postgres"
	"teman-belajar-api/internal/transport/http/handler"
	"teman-belajar-api/internal/transport/http/middleware"
)

func main() {
	ctx := context.Background()
	shutdown, err := observability.InitTracer(ctx, "teman-belajar-api")
	if err != nil {
		log.Fatalf("Failed to init tracer: %v", err)
	}
	defer shutdown(ctx)

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

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	log.Println("Database connection established")

	// Repositories & Services
	cmsRepo := postgres.NewCMSRepository(db)
	auditRepo := postgres.NewAuditRepository(db)
	cmsSvc := cms.NewService(cmsRepo, auditRepo)

	knowledgeRepo := postgres.NewKnowledgeRepository(db)
	knowledgeSvc := knowledge.NewService(knowledgeRepo, auditRepo)
	engagementRepo := postgres.NewEngagementRepository(db)
	engagementResolver := engagementapplication.NewKnowledgeTargetResolver(knowledgeRepo)

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

	// Handlers
	cmsHandler := handler.NewCMSHandler(cmsSvc)
	knowledgeHandler := handler.NewKnowledgeHandler(knowledgeSvc)
	learningHandler := handler.NewLearningHandler(learningSvc)

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

		mediaRepo := postgres.NewMediaRepository(db)
		mediaSvc = media.NewService(mediaRepo, minioStorage, auditRepo, minioBucket, 20*1024*1024)
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
	analyticsHandler := handler.NewAnalyticsHandler(analyticsRepo)

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
		log.Printf("Warning: OIDC init failed: %v. API will start but auth may fail if Keycloak isn't up yet.", err)
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

	mux.HandleFunc("/api/v1/health", handler.HealthCheck)
	// Analytics endpoints
	mux.Handle("POST /api/v1/analytics/events", http.HandlerFunc(analyticsHandler.HandleIngest))
	mux.Handle("GET /api/v1/admin/analytics/statistics", adminAuthMiddleware(http.HandlerFunc(analyticsHandler.HandleGetStatistics)))
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
	mux.HandleFunc("GET /api/v1/ratings/{targetType}/{targetId}", engagementHandler.RatingSummary)

	// Learning endpoints
	mux.Handle("GET /api/v1/learning/courses", authMiddleware(http.HandlerFunc(learningHandler.ListCourses)))
	mux.Handle("GET /api/v1/learning/me", authMiddleware(http.HandlerFunc(learningHandler.GetMe)))
	mux.Handle("GET /api/v1/learning/me/courses", authMiddleware(http.HandlerFunc(learningHandler.ListMyCourses)))
	mux.Handle("GET /api/v1/learning/me/courses/{courseId}/completion", authMiddleware(http.HandlerFunc(learningHandler.GetMyCourseCompletion)))
	mux.Handle("GET /api/v1/learning/me/courses/{courseId}/grades", authMiddleware(http.HandlerFunc(learningHandler.GetMyCourseGrades)))

	// Admin CMS Endpoints
	mux.Handle("/api/v1/admin/news", adminAuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			cmsHandler.ListAdminNews(w, r)
			return
		}
		cmsHandler.CreateNews(w, r)
	})))
	mux.Handle("/api/v1/admin/news/", adminAuthMiddleware(http.HandlerFunc(cmsHandler.TransitionNews)))
	mux.Handle("/api/v1/admin/announcements", adminAuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			cmsHandler.ListAdminAnnouncements(w, r)
			return
		}
		cmsHandler.CreateAnnouncement(w, r)
	})))
	mux.Handle("/api/v1/admin/announcements/", adminAuthMiddleware(http.HandlerFunc(cmsHandler.TransitionAnnouncement)))

	mux.HandleFunc("GET /api/v1/knowledge", knowledgeHandler.ListPublicArticles)
	mux.HandleFunc("GET /api/v1/knowledge/{slug}", knowledgeHandler.GetPublicArticle)

	if mediaHandler != nil {
		mux.HandleFunc("GET /api/v1/media/{id}/content", mediaHandler.GetMediaContent)

		// Admin Media Endpoints
		mux.Handle("GET /api/v1/admin/media", adminAuthMiddleware(http.HandlerFunc(mediaHandler.ListAdminMedia)))
		mux.Handle("POST /api/v1/admin/media", adminAuthMiddleware(http.HandlerFunc(mediaHandler.CreateMedia)))
		mux.Handle("GET /api/v1/admin/media/{id}", adminAuthMiddleware(http.HandlerFunc(mediaHandler.GetAdminMedia)))
		mux.Handle("GET /api/v1/admin/media/{id}/content", adminAuthMiddleware(http.HandlerFunc(mediaHandler.GetAdminMediaContent)))
		mux.Handle("PATCH /api/v1/admin/media/{id}", adminAuthMiddleware(http.HandlerFunc(mediaHandler.UpdateMediaMetadata)))
		mux.Handle("POST /api/v1/admin/media/{id}/archive", adminAuthMiddleware(http.HandlerFunc(mediaHandler.ArchiveMedia)))

		mux.Handle("POST /api/v1/admin/media/{id}/attach", adminAuthMiddleware(http.HandlerFunc(mediaHandler.AttachMediaUsage)))
		mux.Handle("POST /api/v1/admin/media/{id}/detach", adminAuthMiddleware(http.HandlerFunc(mediaHandler.DetachMediaUsage)))
	}

	mux.Handle("GET /api/v1/admin/knowledge", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.ListAdminArticles)))
	mux.Handle("POST /api/v1/admin/knowledge", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.CreateArticle)))
	mux.Handle("GET /api/v1/admin/knowledge/{id}", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.GetAdminArticle)))
	mux.Handle("POST /api/v1/admin/knowledge/{id}/revisions", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.CreateRevision)))
	mux.Handle("POST /api/v1/admin/knowledge/{id}/transition", adminAuthMiddleware(http.HandlerFunc(knowledgeHandler.TransitionStatus)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting teman-belajar-api on :%s", port)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}




