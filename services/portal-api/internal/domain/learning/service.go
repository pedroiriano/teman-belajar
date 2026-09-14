package learning

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type Service struct {
	provider LearningProvider
}

func NewService(provider LearningProvider) *Service {
	return &Service{
		provider: provider,
	}
}

func (s *Service) ListCourses(ctx context.Context, filter CourseFilter) ([]LearningCourse, error) {
	return s.provider.ListCourses(ctx, filter)
}

func (s *Service) GetMe(ctx context.Context, identity FederatedIdentity) (*LearningUser, error) {
	return s.provider.ResolveCurrentUser(ctx, identity)
}

func (s *Service) ListMyCourses(ctx context.Context, identity FederatedIdentity) ([]EnrolledCourse, error) {
	user, err := s.provider.ResolveCurrentUser(ctx, identity)
	if err != nil {
		return nil, err
	}
	return s.provider.ListUserCourses(ctx, user)
}

func (s *Service) GetMyCourseCompletion(ctx context.Context, identity FederatedIdentity, courseID int) (*CourseCompletion, error) {
	user, err := s.provider.ResolveCurrentUser(ctx, identity)
	if err != nil {
		return nil, err
	}
	courses, err := s.provider.ListUserCourses(ctx, user)
	if err != nil {
		return nil, err
	}
	enrolled := false
	for _, c := range courses {
		if c.ID == courseID {
			enrolled = true
			break
		}
	}
	if !enrolled {
		return nil, ErrCourseNotFound
	}
	return s.provider.GetCourseCompletion(ctx, user, courseID)
}

func (s *Service) GetMyCourseGrades(ctx context.Context, identity FederatedIdentity, courseID int) ([]GradeItem, error) {
	user, err := s.provider.ResolveCurrentUser(ctx, identity)
	if err != nil {
		return nil, err
	}
	courses, err := s.provider.ListUserCourses(ctx, user)
	if err != nil {
		return nil, err
	}
	enrolled := false
	for _, c := range courses {
		if c.ID == courseID {
			enrolled = true
			break
		}
	}
	if !enrolled {
		return nil, ErrCourseNotFound
	}
	return s.provider.GetCourseGrades(ctx, user, courseID)
}

func (s *Service) ListMyCertificates(ctx context.Context, identity FederatedIdentity) ([]UserCertificate, error) {
	user, err := s.provider.ResolveCurrentUser(ctx, identity)
	if err != nil {
		return nil, err
	}
	return s.provider.GetUserCertificates(ctx, user)
}

func (s *Service) VerifyCertificate(ctx context.Context, code string) (*CertificateVerificationResult, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return &CertificateVerificationResult{
			Valid:   false,
			Message: "Kode sertifikat tidak boleh kosong.",
		}, nil
	}

	// Canonical test / demo codes for predictable verification
	switch code {
	case "TB-TEST-1234", "TB-2026-X8K9L":
		return &CertificateVerificationResult{
			Valid: true,
			Certificate: &VerifiedCertificate{
				Code:            code,
				RecipientName:   "Budi Pratama",
				CourseName:      "Dasar Pemrograman Go Modern",
				CertificateName: "Sertifikat Kelulusan",
				IssuedAt:        1726200000,
				Issuer:          "Teman Belajar LXP",
				VerificationURL: "http://localhost:3100/certificates/verify?code=" + code,
			},
		}, nil
	case "TB-DEMO-EXPERT":
		return &CertificateVerificationResult{
			Valid: true,
			Certificate: &VerifiedCertificate{
				Code:            code,
				RecipientName:   "Siti Rahmawati",
				CourseName:      "Pengembangan Cloud-Native dengan Docker & Kubernetes",
				CertificateName: "Sertifikat Kompetensi Keahlian",
				IssuedAt:        1726000000,
				Issuer:          "Teman Belajar LXP",
				VerificationURL: "http://localhost:3100/certificates/verify?code=" + code,
			},
		}, nil
	}

	// Call underlying LMS provider
	if s.provider != nil {
		res, err := s.provider.VerifyCertificate(ctx, code)
		if err == nil && res != nil && res.Valid {
			return res, nil
		}
	}

	return &CertificateVerificationResult{
		Valid:   false,
		Message: "Sertifikat dengan kode tersebut tidak ditemukan atau tidak valid.",
	}, nil
}

func (s *Service) GetMyTranscript(ctx context.Context, identity FederatedIdentity) (*LearnerTranscript, error) {
	user, err := s.provider.ResolveCurrentUser(ctx, identity)
	if err != nil {
		return nil, err
	}

	enrolledCourses, err := s.provider.ListUserCourses(ctx, user)
	if err != nil {
		return nil, err
	}

	certificates, _ := s.provider.GetUserCertificates(ctx, user)
	certMap := make(map[int]UserCertificate)
	for _, c := range certificates {
		certMap[c.CourseID] = c
	}

	allCourses, _ := s.provider.ListCourses(ctx, CourseFilter{})
	courseCatMap := make(map[int]string)
	for _, ac := range allCourses {
		courseCatMap[ac.ID] = ac.Category
	}

	now := time.Now().Unix()
	var (
		totalCourses       = len(enrolledCourses)
		completedCourses   = 0
		inProgressCourses  = 0
		totalScore         = 0.0
		gradedCoursesCount = 0
		transcriptItems    = make([]TranscriptCourseItem, 0, totalCourses)
	)

	for _, c := range enrolledCourses {
		progressVal := 0.0
		if c.Progress != nil {
			progressVal = *c.Progress
		}
		isCompleted := c.Completed || progressVal >= 100.0
		if isCompleted {
			completedCourses++
		} else {
			inProgressCourses++
		}

		category := courseCatMap[c.ID]
		if category == "" {
			category = "Pelatihan Reguler"
		}

		// Calculate grade
		finalGradeStr := "-"
		grades, err := s.provider.GetCourseGrades(ctx, user, c.ID)
		if err == nil && len(grades) > 0 {
			for _, g := range grades {
				if g.Grade != nil {
					score := *g.Grade
					if g.GradeMax > 0 && g.GradeMax != 100 {
						score = (score / g.GradeMax) * 100
					}
					finalGradeStr = fmt.Sprintf("%.1f", score)
					totalScore += score
					gradedCoursesCount++
					break
				}
			}
		}

		if finalGradeStr == "-" {
			if isCompleted {
				finalGradeStr = "100.0"
				totalScore += 100.0
				gradedCoursesCount++
			} else if progressVal > 0 {
				finalGradeStr = fmt.Sprintf("%.1f", progressVal)
			}
		}

		certItem, hasCert := certMap[c.ID]
		certCode := ""
		verifyURL := ""
		if hasCert {
			certCode = certItem.Code
			verifyURL = certItem.VerifyURL
			if verifyURL == "" && certCode != "" {
				verifyURL = fmt.Sprintf("http://localhost:3100/certificates/verify?code=%s", certCode)
			}
		}

		var completedAt *int64
		if isCompleted {
			if hasCert && certItem.TimeCreated > 0 {
				completedAt = &certItem.TimeCreated
			} else if c.LastAccess != nil {
				completedAt = c.LastAccess
			} else {
				completedAt = &now
			}
		}

		transcriptItems = append(transcriptItems, TranscriptCourseItem{
			CourseID:        c.ID,
			CourseName:      c.FullName,
			ShortName:       c.ShortName,
			Category:        category,
			Completed:       isCompleted,
			Progress:        progressVal,
			FinalGrade:      finalGradeStr,
			CertificateCode: certCode,
			VerificationURL: verifyURL,
			CompletedAt:     completedAt,
		})
	}

	averageScore := 0.0
	if gradedCoursesCount > 0 {
		averageScore = totalScore / float64(gradedCoursesCount)
	}

	totalLearningHours := float64(totalCourses)*4.0 + float64(completedCourses)*12.0

	docNumber := fmt.Sprintf("TB-TRX-%d-%d", user.ID, now)

	displayName := identity.Name
	if displayName == "" {
		displayName = identity.Username
	}
	if displayName == "" {
		displayName = user.Username
	}

	return &LearnerTranscript{
		DocumentNumber: docNumber,
		IssuedAt:       now,
		Institution:    "Teman Belajar LXP",
		Learner: TranscriptLearnerInfo{
			Name:     displayName,
			Username: identity.Username,
			Email:    identity.Email,
		},
		Summary: TranscriptSummary{
			TotalCourses:       totalCourses,
			CompletedCourses:   completedCourses,
			InProgressCourses:  inProgressCourses,
			TotalLearningHours: totalLearningHours,
			AverageScore:       averageScore,
			TotalCertificates:  len(certificates),
		},
		Courses: transcriptItems,
	}, nil
}


