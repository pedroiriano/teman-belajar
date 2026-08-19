const fs = require('fs');
const file = 'openapi/openapi.yaml';
let content = fs.readFileSync(file, 'utf8');

const additional = `
  /api/v1/internal/analytics/statistics:
    get:
      summary: Retrieve product analytics and API statistics
      security:
        - KeycloakToken: []
      parameters:
        - name: days
          in: query
          required: false
          schema:
            type: integer
            enum: [1, 7, 30, 90, 180, 365]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StatisticsResponse'
`;

const schemas = `
    StatisticsResponse:
      type: object
      properties:
        api:
          type: object
          properties:
            request_rate:
              $ref: '#/components/schemas/PromValue'
            error_rate:
              $ref: '#/components/schemas/PromValue'
            p50_latency:
              $ref: '#/components/schemas/PromValue'
            p95_latency:
              $ref: '#/components/schemas/PromValue'
            p99_latency:
              $ref: '#/components/schemas/PromValue'
            status_2xx:
              $ref: '#/components/schemas/PromValue'
            status_4xx:
              $ref: '#/components/schemas/PromValue'
            status_5xx:
              $ref: '#/components/schemas/PromValue'
        page_views:
          type: array
          items:
            type: object
            properties:
              date:
                type: string
              path:
                type: string
              views:
                type: integer
              unique_visitors:
                type: integer
        learning:
          type: array
          items:
            type: object
            properties:
              date:
                type: string
              active_learners:
                type: integer
              learning_starts:
                type: integer
              completions:
                type: integer
              completion_rate:
                type: number
              top_courses:
                type: array
                items:
                  type: object
                  properties:
                    course_id:
                      type: integer
                    course_name:
                      type: string
                    accesses:
                      type: integer
                    unique_learners:
                      type: integer
        sso:
          type: array
          items:
            type: object
            properties:
              date:
                type: string
              successful_logins:
                type: integer
              failed_logins:
                type: integer
        period_unique_visitors:
          type: integer
        freshness:
          type: object
          properties:
            analytics_last_rollup:
              type: string
            prometheus_observed_at:
              type: string
    PromValue:
      type: object
      properties:
        value:
          type: string
        available:
          type: boolean
`;

if (!content.includes('/api/v1/internal/analytics/statistics')) {
  // Find where to inject endpoints
  const tagStart = content.indexOf('  /api/v1/analytics/events:');
  content = content.slice(0, tagStart) + additional + '\n' + content.slice(tagStart);
}

if (!content.includes('StatisticsResponse:')) {
  content = content + schemas;
}

fs.writeFileSync(file, content);
console.log('done openapi');
