package workerhealth

import (
	"context"
	"errors"
	"net/http"
	"time"
)

func Serve(ctx context.Context, address string, recorder *Recorder) error {
	server := &http.Server{Addr: address, Handler: recorder.Handler(), ReadHeaderTimeout: 2 * time.Second}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
