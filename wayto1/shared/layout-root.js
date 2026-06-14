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
      window.location.href = "/wayto1/contact.html#contact-form";
    });
  }

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

  nav.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      if (nav.classList.contains("menu-open")) closeMenu();
    });
  });

  const navList = nav.querySelector(".nav-links");
  if (navList) {
    navList.addEventListener("click", (e) => {
      const lastChild = navList.lastElementChild;
      if (!lastChild) return;
      const lastRect = lastChild.getBoundingClientRect();
      if (e.target === navList && e.clientY > lastRect.bottom) {
        window.location.href = "/wayto1/contact.html#contact-form";
      }
    });
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900 && nav.classList.contains("menu-open")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("menu-open")) {
      closeMenu();
    }
  });
}

async function loadSharedLayout() {
  await Promise.all([
    injectShared("#shared-nav", "/wayto1/shared/nav.html"),
    injectShared("#shared-footer", "/wayto1/shared/footer.html")
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
