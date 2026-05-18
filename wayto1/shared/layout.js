async function injectShared(selector, filePath) {
  const target = document.querySelector(selector);
  if (!target) return;
  const response = await fetch(filePath, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error("Failed to load " + filePath);
  }
  target.innerHTML = await response.text();
}

function markCurrentNav() {
  const current = document.body.dataset.navCurrent;
  if (!current) return;
  const item = document.querySelector('[data-nav-page="' + current + '"]');
  if (item) item.classList.add("current");
}

async function loadSharedLayout() {
  await Promise.all([
    injectShared("#shared-nav", "shared/nav.html"),
    injectShared("#shared-footer", "shared/footer.html")
  ]);
  markCurrentNav();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    loadSharedLayout().catch((error) => console.error(error));
  });
} else {
  loadSharedLayout().catch((error) => console.error(error));
}
