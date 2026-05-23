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

  // Mobile menu toggle
  const hamburger = nav.querySelector(".nav-hamburger");
  const backdrop = nav.parentElement && nav.parentElement.querySelector(".nav-mobile-backdrop");

  function closeMenu() {
    nav.classList.remove("menu-open");
    document.body.classList.remove("nav-locked");
    if (hamburger) hamburger.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    nav.classList.add("menu-open");
    document.body.classList.add("nav-locked");
    if (hamburger) hamburger.setAttribute("aria-expanded", "true");
  }

  if (hamburger) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (nav.classList.contains("menu-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", closeMenu);
  }

  // Close when tapping any leaf link inside the drawer
  nav.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      if (nav.classList.contains("menu-open")) closeMenu();
    });
  });

  // Inline CTA inside drawer (::after pseudo isn't clickable as element,
  // so we use event delegation on the .nav-links container)
  const navList = nav.querySelector(".nav-links");
  if (navList) {
    navList.addEventListener("click", (e) => {
      const rect = navList.getBoundingClientRect();
      const lastChild = navList.lastElementChild;
      if (!lastChild) return;
      const lastRect = lastChild.getBoundingClientRect();
      // Detect click below the last <li> (i.e. on the ::after CTA area)
      if (e.target === navList && e.clientY > lastRect.bottom) {
        window.location.href = "/process.html#contact";
      }
    });
  }

  // Close menu if window grows past mobile breakpoint
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && nav.classList.contains("menu-open")) {
      closeMenu();
    }
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("menu-open")) {
      closeMenu();
    }
  });
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
