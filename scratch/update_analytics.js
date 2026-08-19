const fs = require('fs');
const file = 'services/portal-api/internal/transport/http/handler/analytics.go';
let content = fs.readFileSync(file, 'utf8');

const regex = /func \(h \*AnalyticsHandler\) HandleGetStatistics\(w http\.ResponseWriter, r \*http\.Request\) \{[\s\S]*\}\n/m;
const repl = fs.readFileSync('scratch/prom_logic.go', 'utf8');

content = content.replace(regex, 'func (h *AnalyticsHandler) HandleGetStatistics(w http.ResponseWriter, r *http.Request) {\n' + repl + '\n');
fs.writeFileSync(file, content);
console.log('done replacing analytics.go');
