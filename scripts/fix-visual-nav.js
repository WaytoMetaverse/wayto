const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "visual.html");
let html = fs.readFileSync(filePath, "utf8");

html = html.replace(
  /  <motion\.div class="app-wrapper w-full h-full">[\s\S]*?<!-- Hero 區 \(nav removed\) -->[\s\S]*?<\/div><!-- Hero 區 -->/,
  '  <div class="app-wrapper w-full h-full">\n   <!-- Hero 區 -->'
);

html = html.replace(/<motion\.div/g, "<div").replace(/<\/motion\.motion\.div>/g, "</div>");

fs.writeFileSync(filePath, html, "utf8");
console.log("fixed visual.html");
