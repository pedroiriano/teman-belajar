package observability

import (
	"database/sql"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

func InitDBMetrics(db *sql.DB, dbName string) {
	openConns := prometheus.NewGaugeFunc(prometheus.GaugeOpts{
		Name: "db_connections_open",
		Help: "Current number of open connections to the DB",
		ConstLabels: prometheus.Labels{"db": dbName},
	}, func() float64 { return float64(db.Stats().OpenConnections) })

	inUseConns := prometheus.NewGaugeFunc(prometheus.GaugeOpts{
		Name: "db_connections_in_use",
		Help: "Current number of in-use connections to the DB",
		ConstLabels: prometheus.Labels{"db": dbName},
	}, func() float64 { return float64(db.Stats().InUse) })

	idleConns := prometheus.NewGaugeFunc(prometheus.GaugeOpts{
		Name: "db_connections_idle",
		Help: "Current number of idle connections to the DB",
		ConstLabels: prometheus.Labels{"db": dbName},
	}, func() float64 { return float64(db.Stats().Idle) })

	waitCount := prometheus.NewCounterFunc(prometheus.CounterOpts{
		Name: "db_connections_wait_count_total",
		Help: "Total number of connections waited for",
		ConstLabels: prometheus.Labels{"db": dbName},
	}, func() float64 { return float64(db.Stats().WaitCount) })

	waitDuration := prometheus.NewCounterFunc(prometheus.CounterOpts{
		Name: "db_connections_wait_duration_seconds_total",
		Help: "Total time waited for new connections",
		ConstLabels: prometheus.Labels{"db": dbName},
	}, func() float64 { return float64(db.Stats().WaitDuration) / float64(time.Second) })

	prometheus.MustRegister(openConns)
	prometheus.MustRegister(inUseConns)
	prometheus.MustRegister(idleConns)
	prometheus.MustRegister(waitCount)
	prometheus.MustRegister(waitDuration)
}

