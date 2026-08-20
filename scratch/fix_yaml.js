const fs = require('fs');
let file = 'infrastructure/docker/docker-compose.yml';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/        PORTAL_INTERNAL_SECRET/g, '      PORTAL_INTERNAL_SECRET');
fs.writeFileSync(file, data);
console.log('fixed yaml');
