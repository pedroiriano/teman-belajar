import yaml

openapi_file = 'openapi/openapi.yaml'
with open(openapi_file, 'r') as f:
    spec = yaml.safe_load(f)

schemas = spec['components']['schemas']

schemas['SearchDaily'] = {
    'type': 'object',
    'properties': {
        'date': {'type': 'string'},
        'total_searches': {'type': 'integer'},
        'zero_results': {'type': 'integer'},
        'result_clicks': {'type': 'integer'}
    }
}

schemas['ContentDaily'] = {
    'type': 'object',
    'properties': {
        'date': {'type': 'string'},
        'content_type': {'type': 'string'},
        'target_id': {'type': 'string'},
        'views': {'type': 'integer'},
        'unique_visitors': {'type': 'integer'}
    }
}

schemas['EngagementStats'] = {
    'type': 'object',
    'properties': {
        'bookmarks': {'type': 'integer'},
        'ratings': {'type': 'integer'},
        'avg_rating': {'type': 'number'}
    }
}

schemas['StatisticsResponse']['properties']['search'] = {
    'type': 'array',
    'items': {'$ref': '#/components/schemas/SearchDaily'}
}

schemas['StatisticsResponse']['properties']['content'] = {
    'type': 'array',
    'items': {'$ref': '#/components/schemas/ContentDaily'}
}

schemas['StatisticsResponse']['properties']['engagement'] = {
    '$ref': '#/components/schemas/EngagementStats'
}

with open(openapi_file, 'w') as f:
    yaml.dump(spec, f, sort_keys=False)

print("done openapi")
