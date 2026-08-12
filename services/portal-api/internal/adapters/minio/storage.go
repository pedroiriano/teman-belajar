package minio

import (
	"context"
	"io"
	"time"

	"teman-belajar-api/internal/domain/media"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Storage struct {
	client *minio.Client
}

func NewStorage(endpoint, accessKey, secretKey string, useSSL bool) (*Storage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, err
	}
	return &Storage{client: client}, nil
}

func (s *Storage) EnsureBucket(ctx context.Context, bucket string) error {
	exists, err := s.client.BucketExists(ctx, bucket)
	if err != nil {
		return err
	}
	if !exists {
		err = s.client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{})
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Storage) Put(ctx context.Context, bucket, objectKey string, reader io.Reader, objectSize int64, mimeType string) error {
	opts := minio.PutObjectOptions{
		ContentType: mimeType,
	}
	_, err := s.client.PutObject(ctx, bucket, objectKey, reader, objectSize, opts)
	return err
}

func (s *Storage) Get(ctx context.Context, bucket, objectKey string) (io.ReadCloser, error) {
	obj, err := s.client.GetObject(ctx, bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	// Verify object exists
	_, err = obj.Stat()
	if err != nil {
		return nil, err
	}
	return obj, nil
}

func (s *Storage) Stat(ctx context.Context, bucket, objectKey string) (int64, error) {
	info, err := s.client.StatObject(ctx, bucket, objectKey, minio.StatObjectOptions{})
	if err != nil {
		return 0, err
	}
	return info.Size, nil
}

func (s *Storage) Delete(ctx context.Context, bucket, objectKey string) error {
	// Use a short timeout for deterministic compensation
	delCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return s.client.RemoveObject(delCtx, bucket, objectKey, minio.RemoveObjectOptions{})
}

// Ensure Storage implements media.StoragePort
var _ media.StoragePort = (*Storage)(nil)
