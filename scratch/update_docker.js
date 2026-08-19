const fs = require('fs');
const file = 'infrastructure/docker/docker-compose.yml';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/PORTAL_API_INTERNAL_URL: http:\/\/api:8080/g, 'PORTAL_API_INTERNAL_URL: http://api:8080\n        PORTAL_INTERNAL_SECRET: ${TB_PORTAL_INTERNAL_SECRET:?Set TB_PORTAL_INTERNAL_SECRET in infrastructure/docker/.env}');
content = content.replace(/OTEL_EXPORTER_OTLP_ENDPOINT: http:\/\/tempo:4318/g, 'OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318\n        PORTAL_INTERNAL_SECRET: ${TB_PORTAL_INTERNAL_SECRET:?Set TB_PORTAL_INTERNAL_SECRET in infrastructure/docker/.env}');

fs.writeFileSync(file, content);
console.log('done docker-compose');
