package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"teman-belajar-api/internal/adapters/moodle"
	"teman-belajar-api/internal/domain/analytics"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/workerhealth"
)

type workerRepository interface {
	RollupPageDaily(context.Context, string, time.Time, time.Time) error
	RollupSSODaily(context.Context, string, time.Time, time.Time) error
	RollupSearchDaily(context.Context, string, time.Time, time.Time) error
	RollupContentDaily(context.Context, string, time.Time, time.Time) error
	UpdateLearningDaily(context.Context, analytics.LearningDaily) error
	CleanupOldEvents(context.Context, time.Time) error
	MarkWorkerSuccess(context.Context, analytics.WorkerStateKey, time.Time) error
}

func reconcileDay(ctx context.Context, repo workerRepository, moodleClient analytics.LearningAnalyticsSource, loc *time.Location, t time.Time) bool {
	// Truncate to midnight in the target timezone
	midnightLocal := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, loc)
	nextMidnightLocal := midnightLocal.AddDate(0, 0, 1)

	reportingDate := midnightLocal.Format("2006-01-02")

	startUTC := midnightLocal.UTC()
	endUTC := nextMidnightLocal.UTC()

	log.Printf("Rolling up for %v (UTC: %v to %v)", reportingDate, startUTC.Format(time.RFC3339), endUTC.Format(time.RFC3339))

	rollupSucceeded := true
	if err := repo.RollupPageDaily(ctx, reportingDate, startUTC, endUTC); err != nil {
		log.Printf("Error rolling up page daily for %v: %v", reportingDate, err)
		rollupSucceeded = false
	}

	if err := repo.RollupSSODaily(ctx, reportingDate, startUTC, endUTC); err != nil {
		log.Printf("Error rolling up sso daily for %v: %v", reportingDate, err)
		rollupSucceeded = false
	}

	if err := repo.RollupSearchDaily(ctx, reportingDate, startUTC, endUTC); err != nil {
		log.Printf("Error rolling up search daily for %v: %v", reportingDate, err)
		rollupSucceeded = false
	}
	if err := repo.RollupContentDaily(ctx, reportingDate, startUTC, endUTC); err != nil {
		log.Printf("Error rolling up content daily for %v: %v", reportingDate, err)
		rollupSucceeded = false
	}
	if rollupSucceeded {
		if err := repo.MarkWorkerSuccess(ctx, analytics.WorkerStateRollup, time.Now().UTC()); err != nil {
			log.Printf("Error recording successful analytics rollup for %v: %v", reportingDate, err)
			rollupSucceeded = false
		}
	}

	// Moodle analytics
	dateStr := reportingDate
	learningRes, err := moodleClient.GetLearningAnalytics(ctx, reportingDate, reportingDate)
	moodleSucceeded := false
	if err != nil {
		log.Printf("Error fetching learning analytics from Moodle for %s: %v", dateStr, err)
	} else {
		topCoursesJSON, _ := json.Marshal(learningRes.TopCourses)
		err = repo.UpdateLearningDaily(ctx, analytics.LearningDaily{
			Date:               reportingDate,
			ActiveLearners:     learningRes.ActiveLearners,
			LearningStarts:     learningRes.LearningStarts,
			EligibleEnrolments: learningRes.EligibleEnrolments,
			Completions:        learningRes.Completions,
			CompletionRate:     learningRes.CompletionRate,
			TopCourses:         topCoursesJSON,
		})
		if err != nil {
			log.Printf("Error updating learning daily for %v: %v", reportingDate, err)
		} else {
			log.Printf("Saved learning analytics for %s: %d active, %d starts, %d completions", dateStr, learningRes.ActiveLearners, learningRes.LearningStarts, learningRes.Completions)
			if err := repo.MarkWorkerSuccess(ctx, analytics.WorkerStateMoodleSync, time.Now().UTC()); err != nil {
				log.Printf("Error recording successful Moodle analytics sync for %v: %v", reportingDate, err)
			} else {
				moodleSucceeded = true
			}
		}
	}
	return rollupSucceeded && moodleSucceeded
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	shutdown, err := observability.InitTracer(ctx, "teman-belajar-analytics-worker")
	if err != nil {
		log.Printf("Failed to init tracer (non-critical): %v", err)
	} else {
		defer shutdown(ctx)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Missing required environment variable: DATABASE_URL")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	repo := analytics.NewPostgresRepository(db)
	healthRecorder := workerhealth.NewRecorder(15 * time.Minute)
	go func() {
		if err := workerhealth.Serve(ctx, ":8081", healthRecorder); err != nil {
			log.Printf("analytics worker health endpoint stopped: %v", err)
		}
	}()

	moodleToken := os.Getenv("TB_MOODLE_WEBSERVICE_TOKEN")
	moodleBaseURL := os.Getenv("MOODLE_INTERNAL_BASE_URL")
	if moodleBaseURL == "" {
		moodleBaseURL = "http://moodle"
	}
	moodlePublicBaseURL := os.Getenv("MOODLE_PUBLIC_BASE_URL")
	if moodlePublicBaseURL == "" {
		log.Fatal("Missing required environment variable: MOODLE_PUBLIC_BASE_URL")
	}
	if moodleToken == "" {
		log.Fatal("Missing required environment variable: TB_MOODLE_WEBSERVICE_TOKEN")
	}

	moodleClient := moodle.NewClient(moodle.Config{
		BaseURL:       moodleBaseURL,
		PublicBaseURL: moodlePublicBaseURL,
		Token:         moodleToken,
		Timeout:       15 * time.Second,
	})

	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.UTC
	}

	retentionDaysStr := os.Getenv("ANALYTICS_RAW_RETENTION_DAYS")
	retentionDays := 30
	if retentionDaysStr != "" {
		if parsed, err := strconv.Atoi(retentionDaysStr); err == nil && parsed > 0 && parsed <= 365 {
			retentionDays = parsed
		}
	}

	// Initial Run
	log.Println("Analytics Worker started. Running initial reconciliation...")
	now := time.Now().In(loc)
	reconcileDay(ctx, repo, moodleClient, loc, now.AddDate(0, 0, -1))      // Yesterday
	healthRecorder.Record(reconcileDay(ctx, repo, moodleClient, loc, now)) // Today

	// Cleanup
	cutoffUTC := now.UTC().AddDate(0, 0, -retentionDays)
	log.Printf("Cleaning up raw events older than %v (retention: %d days)", cutoffUTC, retentionDays)
	if err := repo.CleanupOldEvents(ctx, cutoffUTC); err != nil {
		log.Printf("Error cleaning up old events: %v", err)
	} else if err := repo.MarkWorkerSuccess(ctx, analytics.WorkerStateCleanup, time.Now().UTC()); err != nil {
		log.Printf("Error recording successful analytics cleanup: %v", err)
	}

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	cleanupTicker := time.NewTicker(24 * time.Hour)
	defer cleanupTicker.Stop()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	log.Println("Analytics Worker entering periodic loop")

	for {
		select {
		case <-stop:
			log.Println("Shutting down analytics worker")
			return
		case <-ticker.C:
			current := time.Now().In(loc)
			healthRecorder.Record(reconcileDay(ctx, repo, moodleClient, loc, current))
		case <-cleanupTicker.C:
			curr := time.Now().UTC()
			cutoffUTC := curr.AddDate(0, 0, -retentionDays)
			log.Printf("Periodic cleanup for raw events older than %v", cutoffUTC)
			if err := repo.CleanupOldEvents(ctx, cutoffUTC); err != nil {
				log.Printf("Error cleaning up old events: %v", err)
			} else if err := repo.MarkWorkerSuccess(ctx, analytics.WorkerStateCleanup, time.Now().UTC()); err != nil {
				log.Printf("Error recording successful analytics cleanup: %v", err)
			}
		}
	}
}
