const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "tech.html");
let html = fs.readFileSync(filePath, "utf8");

html = html.replace(
  '  <div class="app-wrapper w-full h-full"><motion.div id="shared-nav"></motion.div>\n\n   <!-- Hero 區 --><!-- Hero 區 -->',
  '  <div id="shared-nav"></div>\n  <div class="app-wrapper w-full h-full">\n   <!-- Hero 區 -->'
);

html = html.replace(
  '  <div class="app-wrapper w-full h-full"><div id="shared-nav"></div>\n\n   <!-- Hero 區 --><!-- Hero 區 -->',
  '  <div id="shared-nav"></div>\n  <div class="app-wrapper w-full h-full">\n   <!-- Hero 區 -->'
);

fs.writeFileSync(filePath, html, "utf8");
console.log("fixed tech.html");
