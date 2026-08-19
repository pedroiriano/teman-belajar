const fs = require('fs');

const path = 'openapi/openapi.yaml';
let yaml = fs.readFileSync(path, 'utf8');

const analyticsEndpoints = `
  /api/v1/analytics/events:
    post:
      summary: Submit a public product analytics event
      tags: [Analytics]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AnalyticsEventRequest'
      responses:
        '202':
          description: Event accepted
        '413':
          description: Payload Too Large
        '422':
          $ref: '#/components/responses/UnprocessableEntity'
  /api/v1/internal/analytics/events:
    post:
      summary: Submit a trusted internal analytics event
      tags: [Analytics]
      parameters:
        - in: header
          name: X-Internal-Token
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AnalyticsEventRequest'
      responses:
        '202':
          description: Event accepted
        '403':
          $ref: '#/components/responses/Forbidden'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'
  /api/v1/admin/analytics/statistics:
    get:
      summary: Get platform statistics (Admin)
      tags: [Analytics]
      parameters:
        - in: query
          name: days
          schema:
            type: integer
            enum: [1, 7, 30, 90, 180, 365]
            default: 30
      responses:
        '200':
          description: Statistics successfully retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminStatisticsResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
`;

const analyticsSchemas = `
    AnalyticsEventRequest:
      type: object
      required: [event_type, url]
      properties:
        event_type:
          type: string
        url:
          type: string
        referrer:
          type: string
        metadata:
          type: object
    AdminStatisticsResponse:
      type: object
      properties:
        api:
          type: object
        page_views:
          type: object
        learning:
          type: object
        sso:
          type: object
`;

if (!yaml.includes('/api/v1/analytics/events')) {
  yaml = yaml.replace('  /api/v1/search:', analyticsEndpoints + '  /api/v1/search:');
}

if (!yaml.includes('AnalyticsEventRequest')) {
  yaml = yaml.replace('    Problem:', analyticsSchemas + '    Problem:');
}

fs.writeFileSync(path, yaml);
console.log('OpenAPI updated.');
