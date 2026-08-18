package moodle

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/learning"
)

type Config struct {
	BaseURL       string
	PublicBaseURL string
	Token         string
	Timeout       time.Duration
}

type Client struct {
	config     Config
	httpClient *http.Client
}

func NewClient(config Config) *Client {
	if config.Timeout == 0 {
		config.Timeout = 10 * time.Second
	}

	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 100,
		IdleConnTimeout:     90 * time.Second,
	}

	return &Client{
		config: config,
		httpClient: &http.Client{
			Timeout:   config.Timeout,
			Transport: transport,
		},
	}
}

// MoodleError represents an error payload returned by Moodle REST API
type MoodleError struct {
	Exception string `json:"exception"`
	Errorcode string `json:"errorcode"`
	Message   string `json:"message"`
	Debuginfo string `json:"debuginfo,omitempty"`
}

func (e *MoodleError) Error() string {
	return fmt.Sprintf("moodle error: %s - %s", e.Errorcode, e.Message)
}

func (c *Client) callWS(ctx context.Context, wsfunction string, params url.Values, dst interface{}) error {
	u, err := url.Parse(c.config.BaseURL)
	if err != nil {
		return err
	}
	u.Path = "/webservice/rest/server.php"

	if params == nil {
		params = url.Values{}
	}
	params.Set("wstoken", c.config.Token)
	params.Set("wsfunction", wsfunction)
	params.Set("moodlewsrestformat", "json")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.String(), strings.NewReader(params.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if c.config.PublicBaseURL != "" {
		publicURL, parseErr := url.Parse(c.config.PublicBaseURL)
		if parseErr != nil || publicURL.Host == "" {
			return fmt.Errorf("invalid Moodle public base URL")
		}
		// Connect over private service DNS while presenting Moodle's canonical
		// public host. This prevents Moodle redirecting server-to-server calls to
		// localhost inside the container.
		req.Host = publicURL.Host
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return learning.ErrMoodleTimeout
		}
		// Try to detect http client timeout error (url.Error wrapping a timeout)
		var netErr net.Error
		if errors.As(err, &netErr) && netErr.Timeout() {
			return learning.ErrMoodleTimeout
		}
		return fmt.Errorf("%w: %v", learning.ErrMoodleUnavailable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%w: status code %d", learning.ErrMoodleUnavailable, resp.StatusCode)
	}

	limit := int64(5 * 1024 * 1024)
	body, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return err
	}
	if int64(len(body)) > limit {
		return fmt.Errorf("%w: response too large", learning.ErrMoodleInvalidResponse)
	}

	// Moodle often returns a 200 OK with an error JSON payload.
	// Check if it's an error.
	if strings.Contains(string(body), `"exception"`) && strings.Contains(string(body), `"errorcode"`) {
		var moodleErr MoodleError
		if err := json.Unmarshal(body, &moodleErr); err == nil && moodleErr.Exception != "" {
			return c.mapError(&moodleErr)
		}
	}

	// Reject false or null
	if string(body) == "false" || string(body) == "null" {
		return fmt.Errorf("%w: received null or false", learning.ErrMoodleInvalidResponse)
	}

	if dst != nil {
		if err := json.Unmarshal(body, dst); err != nil {
			return fmt.Errorf("%w: %v", learning.ErrMoodleInvalidResponse, err)
		}
	}

	return nil
}

func (c *Client) mapError(err *MoodleError) error {
	switch err.Errorcode {
	case "invalidtoken", "accessexception":
		return learning.ErrMoodleAuthentication
	case "nopermissions":
		return learning.ErrMoodlePermission
	case "invalidparameter", "invalidrecord":
		return learning.ErrMoodleInvalidResponse
	case "webservice_function_not_found":
		return learning.ErrMoodleFunction
	case "errorcoursecompletedisabled", "completionnotenabled":
		// Can be handled up the stack if it shouldn't be a fatal error
		return fmt.Errorf("%w: errorcoursecompletedisabled", learning.ErrMoodleInvalidResponse)
	default:
		// Do not leak debuginfo
		return fmt.Errorf("%w: %s", learning.ErrMoodleUnavailable, err.Message)
	}
}
