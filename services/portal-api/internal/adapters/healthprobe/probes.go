package healthprobe

import (
	"bufio"
	"context"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/integrationhealth"
)

type Static struct{ definition integrationhealth.Definition }

func NewStatic(definition integrationhealth.Definition) *Static {
	return &Static{definition: definition}
}

type Unknown struct{ definition integrationhealth.Definition }

func NewUnknown(definition integrationhealth.Definition) *Unknown {
	return &Unknown{definition: definition}
}
func (p *Unknown) Definition() integrationhealth.Definition { return p.definition }
func (*Unknown) Check(context.Context) integrationhealth.Observation {
	return integrationhealth.Observation{Status: integrationhealth.StatusUnknown, ErrorClass: "probe_misconfigured"}
}
func (p *Static) Definition() integrationhealth.Definition { return p.definition }
func (*Static) Check(context.Context) integrationhealth.Observation {
	return integrationhealth.Observation{Status: integrationhealth.StatusHealthy}
}

type HTTP struct {
	definition integrationhealth.Definition
	target     string
	client     *http.Client
}

func NewHTTP(definition integrationhealth.Definition, target string) (*HTTP, error) {
	parsed, err := url.ParseRequestURI(target)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return nil, fmt.Errorf("invalid fixed health target")
	}
	if parsed.User != nil {
		return nil, fmt.Errorf("fixed health target must not contain credentials")
	}
	return &HTTP{
		definition: definition,
		target:     parsed.String(),
		client: &http.Client{
			Timeout: 3 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}, nil
}

func (p *HTTP) Definition() integrationhealth.Definition { return p.definition }
func (p *HTTP) Check(ctx context.Context) integrationhealth.Observation {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, p.target, nil)
	if err != nil {
		return integrationhealth.Observation{Status: integrationhealth.StatusUnknown, ErrorClass: "probe_misconfigured"}
	}
	response, err := p.client.Do(request)
	if err != nil {
		if ctx.Err() != nil {
			return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "timeout"}
		}
		return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "connection_failed"}
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
	if response.StatusCode < 200 || response.StatusCode >= 400 {
		return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "unhealthy_response"}
	}
	return integrationhealth.Observation{Status: integrationhealth.StatusHealthy}
}

type Database struct {
	definition integrationhealth.Definition
	db         *sql.DB
}

func NewDatabase(definition integrationhealth.Definition, db *sql.DB) *Database {
	return &Database{definition: definition, db: db}
}
func (p *Database) Definition() integrationhealth.Definition { return p.definition }
func (p *Database) Check(ctx context.Context) integrationhealth.Observation {
	if p.db == nil {
		return integrationhealth.Observation{Status: integrationhealth.StatusUnknown, ErrorClass: "probe_misconfigured"}
	}
	if err := p.db.PingContext(ctx); err != nil {
		if ctx.Err() != nil {
			return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "timeout"}
		}
		return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "connection_failed"}
	}
	return integrationhealth.Observation{Status: integrationhealth.StatusHealthy}
}

type Redis struct {
	definition integrationhealth.Definition
	address    string
	username   string
	password   string
	useTLS     bool
}

func NewRedis(definition integrationhealth.Definition, rawURL string) (*Redis, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "redis" && parsed.Scheme != "rediss") {
		return nil, fmt.Errorf("invalid fixed Redis target")
	}
	username, password := "", ""
	if parsed.User != nil {
		username = parsed.User.Username()
		password, _ = parsed.User.Password()
	}
	return &Redis{definition: definition, address: parsed.Host, username: username, password: password, useTLS: parsed.Scheme == "rediss"}, nil
}

func (p *Redis) Definition() integrationhealth.Definition { return p.definition }
func (p *Redis) Check(ctx context.Context) integrationhealth.Observation {
	dialer := &net.Dialer{Timeout: 2 * time.Second}
	var connection net.Conn
	var err error
	if p.useTLS {
		connection, err = tls.DialWithDialer(dialer, "tcp", p.address, &tls.Config{MinVersion: tls.VersionTLS12})
	} else {
		connection, err = dialer.DialContext(ctx, "tcp", p.address)
	}
	if err != nil {
		return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "connection_failed"}
	}
	defer connection.Close()
	deadline, ok := ctx.Deadline()
	if ok {
		_ = connection.SetDeadline(deadline)
	}
	reader := bufio.NewReader(connection)
	if p.password != "" {
		args := []string{"AUTH"}
		if p.username != "" {
			args = append(args, p.username)
		}
		args = append(args, p.password)
		if err := redisCommand(connection, reader, args...); err != nil {
			return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "unhealthy_response"}
		}
	}
	if err := redisCommand(connection, reader, "PING"); err != nil {
		return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "unhealthy_response"}
	}
	return integrationhealth.Observation{Status: integrationhealth.StatusHealthy}
}

func redisCommand(connection net.Conn, reader *bufio.Reader, args ...string) error {
	var command strings.Builder
	command.WriteString("*" + strconv.Itoa(len(args)) + "\r\n")
	for _, arg := range args {
		command.WriteString("$" + strconv.Itoa(len(arg)) + "\r\n" + arg + "\r\n")
	}
	if _, err := io.WriteString(connection, command.String()); err != nil {
		return err
	}
	line, err := reader.ReadString('\n')
	if err != nil || !strings.HasPrefix(line, "+") {
		return fmt.Errorf("Redis command failed")
	}
	return nil
}

type Worker struct {
	definition integrationhealth.Definition
	target     string
	client     *http.Client
}

func NewWorker(definition integrationhealth.Definition, target string) (*Worker, error) {
	httpProbe, err := NewHTTP(definition, target)
	if err != nil {
		return nil, err
	}
	return &Worker{definition: definition, target: httpProbe.target, client: httpProbe.client}, nil
}

func (p *Worker) Definition() integrationhealth.Definition { return p.definition }
func (p *Worker) Check(ctx context.Context) integrationhealth.Observation {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, p.target, nil)
	if err != nil {
		return integrationhealth.Observation{Status: integrationhealth.StatusUnknown, ErrorClass: "probe_misconfigured"}
	}
	response, err := p.client.Do(request)
	if err != nil {
		return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "connection_failed"}
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "unhealthy_response"}
	}
	var body struct {
		Status        string     `json:"status"`
		LastSuccessAt *time.Time `json:"last_success_at"`
		ErrorClass    string     `json:"error_class"`
	}
	decoder := json.NewDecoder(io.LimitReader(response.Body, 8192))
	if err := decoder.Decode(&body); err != nil {
		return integrationhealth.Observation{Status: integrationhealth.StatusDown, ErrorClass: "unhealthy_response"}
	}
	return integrationhealth.Observation{Status: integrationhealth.Status(body.Status), LastSuccess: body.LastSuccessAt, ErrorClass: body.ErrorClass}
}
