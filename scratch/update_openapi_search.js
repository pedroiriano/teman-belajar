const fs = require('fs');

let yaml = fs.readFileSync('openapi/openapi.yaml', 'utf8');

const searchSchema = `
    SearchDaily:
      type: object
      properties:
        date:
          type: string
        total_searches:
          type: integer
        zero_results:
          type: integer
        result_clicks:
          type: integer
    ContentDaily:
      type: object
      properties:
        date:
          type: string
        content_type:
          type: string
        target_id:
          type: string
        views:
          type: integer
        unique_visitors:
          type: integer
    EngagementStats:
      type: object
      properties:
        bookmarks:
          type: integer
        ratings:
          type: integer
        avg_rating:
          type: number`;

if (!yaml.includes('SearchDaily:')) {
    yaml = yaml.replace('    AnalyticsEventRequest:', searchSchema + '\n    AnalyticsEventRequest:');
}

const statsFields = `
        search:
          type: array
          items:
            $ref: '#/components/schemas/SearchDaily'
        content:
          type: array
          items:
            $ref: '#/components/schemas/ContentDaily'
        engagement:
          $ref: '#/components/schemas/EngagementStats'`;

if (!yaml.includes('search:\n          type: array\n          items:\n            $ref: \'#/components/schemas/SearchDaily\'')) {
    yaml = yaml.replace('        period_unique_visitors:', statsFields + '\n        period_unique_visitors:');
}

fs.writeFileSync('openapi/openapi.yaml', yaml);
console.log('done openapi in node');
