const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LAYOUT_LINK = '  <link rel="stylesheet" href="/wayto1/shared/layout.css">\n';
const LAYOUT_SCRIPT = '  <script src="/wayto1/shared/layout-root.js"></script>\n';

function ensureLayoutLink(html) {
  return html.includes("/wayto1/shared/layout.css")
    ? html
    : html.replace("</head>", LAYOUT_LINK + "</head>");
}

function ensureLayoutScript(html) {
  return html.includes("layout-root.js")
    ? html
    : html.replace("</body>", LAYOUT_SCRIPT + "</body>");
}

function addBodyAttrs(html, navCurrent) {
  return html.replace(/<body([^>]*)>/, (full, attrs) => {
    let a = attrs;
    if (!a.includes("wayto-has-shared-nav")) {
      a = a.includes('class="')
        ? a.replace(/class="([^"]*)"/, 'class="wayto-has-shared-nav $1"')
        : a + ' class="wayto-has-shared-nav"';
    }
    if (!a.includes("data-nav-current")) {
      a += ` data-nav-current="${navCurrent}"`;
    }
    return `<body${a}>`;
  });
}

function replaceStandardNav(html) {
  return html.replace(
    /<!-- Navigation -->[\s\S]*?(?=<!-- Main Content -->)/,
    '<div id="shared-nav"></motion.div>\n\n  <!-- Main Content -->'
  ).replace('<motion.div id="shared-nav"></motion.div>', '<motion.div id="shared-nav"></motion.div>'.replace(/motion\./g, ''));
}

function replaceTechNav(html) {
  return html.replace(
    /<!-- 導航列 -->[\s\S]*?(?=<!-- Hero 區 -->)/,
    '<div id="shared-nav"></div>\n\n   <!-- Hero 區 -->'
  );
}

function replaceFooter(html) {
  return html.replace(/<!-- Footer -->[\s\S]*?<\/footer>\s*/, "");
}

function addSharedFooter(html) {
  return html.includes('id="shared-footer"')
    ? html
    : html.replace("</body>", '  <div id="shared-footer"></div>\n</body>');
}

function updateTailwindPage(name, navCurrent) {
  const filePath = path.join(ROOT, name);
  let html = fs.readFileSync(filePath, "utf8");
  html = ensureLayoutLink(html);
  html = name === "tech.html" ? replaceTechNav(html) : replaceStandardNav(html);
  html = addBodyAttrs(html, navCurrent);
  html = html.replace('<main class="h-full pt-24">', '<main class="h-full">');
  html = html.replace('class="relative pt-20 sm:pt-24"', 'class="relative"');
  html = replaceFooter(html);
  html = addSharedFooter(html);
  html = ensureLayoutScript(html);
  fs.writeFileSync(filePath, html, "utf8");
  console.log("Updated", name);
}

function updateSimplePage(name) {
  const filePath = path.join(ROOT, name);
  let html = fs.readFileSync(filePath, "utf8");
  html = ensureLayoutLink(html);
  html = addBodyAttrs(html, "");
  if (!html.includes('id="shared-nav"')) {
    html = html.replace(/<body[^>]*>/, (tag) => tag + '\n  <div id="shared-nav"></div>\n');
  }
  html = addSharedFooter(html);
  html = ensureLayoutScript(html);
  fs.writeFileSync(filePath, html, "utf8");
  console.log("Updated", name);
}

const pages = {
  "services.html": "solutions",
  "process.html": "faq",
  "portfolio.html": "cases",
  "visual.html": "home",
  "tech.html": "solutions",
};

for (const [name, nav] of Object.entries(pages)) {
  updateTailwindPage(name, nav);
}

for (const name of [
  "insights.html",
  "article-3d-rendering-cost-taiwan.html",
  "article-custom-website-development-cost.html",
  "service-3d-modeling-rendering.html",
  "service-custom-website-development.html",
  "case-study-enterprise-site-revamp.html",
]) {
  updateSimplePage(name);
}
