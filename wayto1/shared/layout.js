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

function initSharedNav() {
  const nav = document.getElementById("mainNav");
  if (!nav) return;

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 20);
  });

  const cta = nav.querySelector(".nav-cta");
  if (cta) {
    cta.addEventListener("click", () => {
      window.location.href = "/process.html#contact";
    });
  }
}

async function loadSharedLayout() {
  await Promise.all([
    injectShared("#shared-nav", "shared/nav.html"),
    injectShared("#shared-footer", "shared/footer.html")
  ]);
  markCurrentNav();
  initSharedNav();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    loadSharedLayout().catch((error) => console.error(error));
  });
} else {
  loadSharedLayout().catch((error) => console.error(error));
}
