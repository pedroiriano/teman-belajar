import re

with open('services/portal-api/internal/transport/http/handler/analytics.go', 'r') as f:
    content = f.read()

with open('scratch/prom_logic.go', 'r') as f:
    prom_logic = f.read()

# Replace from HandleGetStatistics all the way to the end
pattern = re.compile(r'func \(h \*AnalyticsHandler\) HandleGetStatistics\(w http\.ResponseWriter, r \*http\.Request\) \{.*', re.DOTALL)
content = pattern.sub(f'func (h *AnalyticsHandler) HandleGetStatistics(w http.ResponseWriter, r *http.Request) {{\n{prom_logic}', content)

with open('services/portal-api/internal/transport/http/handler/analytics.go', 'w') as f:
    f.write(content)

print("done")
