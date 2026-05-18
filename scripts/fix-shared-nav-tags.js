const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

for (const file of fs.readdirSync(ROOT)) {
  if (!file.endsWith(".html")) continue;
  const filePath = path.join(ROOT, file);
  let html = fs.readFileSync(filePath, "utf8");
  const original = html;

  html = html.replace(/<div id="shared-nav"><\/motion\.div>/g, '<div id="shared-nav"></div>');
  html = html.replace(/<!-- Main Content --><!-- Main Content -->/g, "<!-- Main Content -->");
  html = html.replace(
    /(data-nav-current="[^"]*">)<div id="shared-nav"><\/div>/,
    '$1\n  <motion.div id="shared-nav"></div>'
  );
  html = html.replace(
    '<motion.div id="shared-nav"></div>',
    '<div id="shared-nav"></div>'
  );

  if (html !== original) {
    fs.writeFileSync(filePath, html, "utf8");
    console.log("fixed", file);
  }
}
