const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

let ok = true;
for (const f of pages) {
  const html = fs.readFileSync(path.join(ROOT, f), "utf8");
  const hasOldNav = /<nav class="fixed top-0/.test(html);
  const hasShared = html.includes('id="shared-nav"');
  const hasLayout = html.includes("layout.css") || html.includes("shared/layout.css");
  const hasFooter = html.includes('id="shared-footer"');
  const broken = html.includes("</motion.div>") || html.includes("<motion.div");

  if (hasOldNav) {
    console.log("OLD NAV:", f);
    ok = false;
  }
  if (broken) {
    console.log("BROKEN TAG:", f);
    ok = false;
  }
  if (!hasShared && !f.startsWith("wayto1")) {
    // wayto1 subfolder checked separately
  }
}

const w1 = path.join(ROOT, "wayto1");
for (const f of ["index.html", "about.html"]) {
  const html = fs.readFileSync(path.join(w1, f), "utf8");
  if (!html.includes('id="shared-nav"')) {
    console.log("MISSING shared-nav:", "wayto1/" + f);
    ok = false;
  }
}

console.log(ok ? "All checks passed" : "Some issues found");
