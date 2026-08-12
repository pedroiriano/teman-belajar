package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/lib/pq"

	"teman-belajar-api/internal/domain/cms"
	"teman-belajar-api/internal/domain/knowledge"
	"teman-belajar-api/internal/repository/postgres"
	"teman-belajar-api/internal/transport/http/handler"
	"teman-belajar-api/internal/transport/http/middleware"
)

func main() {
	mux := http.NewServeMux()

	// Database Connection
	dbConnString := os.Getenv("DATABASE_URL")
	if dbConnString == "" {
		dbConnString = "postgres://teman_belajar_portal:local_password@localhost:5432/teman_belajar?sslmode=disable"
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

	// Handlers
	cmsHandler := handler.NewCMSHandler(cmsSvc)
	knowledgeHandler := handler.NewKnowledgeHandler(knowledgeSvc)

	issuerURL := os.Getenv("KEYCLOAK_ISSUER_URL")
	if issuerURL == "" {
		issuerURL = "http://localhost:8081/realms/teman-belajar"
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

	mux.HandleFunc("/api/v1/health", handler.HealthCheck)
	
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

	// Protected endpoints
	mux.Handle("/api/v1/me", authMiddleware(http.HandlerFunc(handler.GetMe)))
	
	// Admin CMS Endpoints
	mux.Handle("/api/v1/admin/news", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			cmsHandler.ListAdminNews(w, r)
			return
		}
		cmsHandler.CreateNews(w, r)
	})))
	mux.Handle("/api/v1/admin/news/", authMiddleware(http.HandlerFunc(cmsHandler.TransitionNews)))
	mux.Handle("/api/v1/admin/announcements", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			cmsHandler.ListAdminAnnouncements(w, r)
			return
		}
		cmsHandler.CreateAnnouncement(w, r)
	})))
	mux.Handle("/api/v1/admin/announcements/", authMiddleware(http.HandlerFunc(cmsHandler.TransitionAnnouncement)))
	
	mux.HandleFunc("GET /api/v1/knowledge/{slug}", knowledgeHandler.GetPublicArticle)
	
	mux.Handle("POST /api/v1/admin/knowledge", authMiddleware(http.HandlerFunc(knowledgeHandler.CreateArticle)))
	mux.Handle("POST /api/v1/admin/knowledge/{id}/revisions", authMiddleware(http.HandlerFunc(knowledgeHandler.CreateRevision)))
	mux.Handle("POST /api/v1/admin/knowledge/{id}/transition", authMiddleware(http.HandlerFunc(knowledgeHandler.TransitionStatus)))

	log.Println("Starting portal-api on :8080")
	
	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
