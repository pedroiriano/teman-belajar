const fs = require('fs');
const yaml = require('js-yaml');

const openapiStr = fs.readFileSync('../openapi/openapi.yaml', 'utf8');
const spec = yaml.load(openapiStr);

if (!spec.paths['/api/v1/search']) {
    spec.paths['/api/v1/search'] = {};
}

spec.paths['/api/v1/search']['get'] = {
    tags: ['Search'],
    summary: 'Unified Search',
    description: 'Search across authoritative domains (courses, knowledge, news, etc.).',
    security: [{ cookieAuth: [] }],
    parameters: [
        {
            name: 'q',
            in: 'query',
            description: 'Search query string',
            required: true,
            schema: { type: 'string' }
        },
        {
            name: 'type',
            in: 'query',
            description: 'Filter by source type (course, knowledge, news, announcement, etc.)',
            required: false,
            schema: { type: 'string' }
        },
        {
            name: 'limit',
            in: 'query',
            description: 'Pagination limit',
            required: false,
            schema: { type: 'integer', default: 10 }
        },
        {
            name: 'offset',
            in: 'query',
            description: 'Pagination offset',
            required: false,
            schema: { type: 'integer', default: 0 }
        }
    ],
    responses: {
        '200': {
            description: 'Search Results',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'object',
                                properties: {
                                    hits: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                type: { type: 'string' },
                                                title: { type: 'string' },
                                                description: { type: 'string' },
                                                url: { type: 'string' },
                                                image_url: { type: 'string', nullable: true },
                                                tags: { type: 'array', items: { type: 'string' } }
                                            },
                                            required: ['id', 'type', 'title', 'description', 'url']
                                        }
                                    },
                                    total_hits: { type: 'integer' },
                                    limit: { type: 'integer' },
                                    offset: { type: 'integer' },
                                    processing_time_ms: { type: 'integer' }
                                },
                                required: ['hits', 'total_hits', 'limit', 'offset', 'processing_time_ms']
                            }
                        }
                    }
                }
            }
        },
        '401': { $ref: '#/components/responses/UnauthorizedError' },
        '503': { $ref: '#/components/responses/ServiceUnavailableError' }
    }
};

if (!spec.components.responses.ServiceUnavailableError) {
    spec.components.responses.ServiceUnavailableError = {
        description: 'Service Unavailable',
        content: {
            'application/problem+json': {
                schema: { $ref: '#/components/schemas/ProblemDetails' }
            }
        }
    };
}

const yamlStr = yaml.dump(spec, { noRefs: true, lineWidth: -1 });
fs.writeFileSync('../openapi/openapi.yaml', yamlStr, 'utf8');
