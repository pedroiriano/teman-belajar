import fs from "fs";
import path from "path";

const forbidden = [
  />Workspace</,
  />Admin Console</,
  />Media Library</,
  />Dashboard</,
  />Learning Experience</,
  />Previous</,
  />Next</,
  />Save</,
  />Cancel</,
  />Loading\.\.\.</,
  />No data available</
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes("node_modules") && !file.includes(".next")) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        results.push(file);
      }
    }
  });
  return results;
}

let failed = false;
const files = walk("./src");

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const regex of forbidden) {
    if (regex.test(content)) {
      console.error(`Forbidden presentation phrase found in ${file}: ${regex}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log("Language guard passed.");
}
