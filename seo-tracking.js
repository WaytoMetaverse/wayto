/*
 * Wayto SEO tracking bootstrap.
 * Configure IDs in window.WAYTO_SEO before this script loads.
 */
(function () {
  var config = window.WAYTO_SEO || {};
  var GA4_ID = config.ga4Id || "";
  var GTM_ID = config.gtmId || "";
  var DEBUG = Boolean(config.debug);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  function logDebug() {
    if (!DEBUG) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[SEO]");
    console.log.apply(console, args);
  }

  function loadScript(src, id) {
    if (!src || (id && document.getElementById(id))) return;
    var script = document.createElement("script");
    script.async = true;
    script.src = src;
    if (id) script.id = id;
    document.head.appendChild(script);
  }

  function initGA4() {
    if (!GA4_ID) return;
    loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID), "ga4-script");
    gtag("js", new Date());
    gtag("config", GA4_ID, {
      anonymize_ip: true,
      send_page_view: true
    });
    logDebug("GA4 initialized", GA4_ID);
  }

  function initGTM() {
    if (!GTM_ID) return;
    if (document.getElementById("gtm-script")) return;
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    loadScript("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM_ID), "gtm-script");
    logDebug("GTM initialized", GTM_ID);
  }

  function track(eventName, params) {
    if (!eventName) return;
    window.gtag("event", eventName, params || {});
    logDebug("event", eventName, params || {});
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function getPageType(pathname) {
    var map = {
      "/": "home",
      "/index.html": "home",
      "/visual.html": "service_3d_overview",
      "/services.html": "service_3d_detail",
      "/tech.html": "service_dev_overview",
      "/portfolio.html": "case_portfolio",
      "/process.html": "process"
    };
    return map[pathname] || "content";
  }

  function attachCtaClickTracking() {
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      var button = target.closest("button, a");
      if (!button) return;

      var href = button.getAttribute("href") || "";
      var text = normalizeText(button.textContent);
      var trackName = button.getAttribute("data-track-event");
      var trackLabel = button.getAttribute("data-track-label") || text || href;

      if (trackName) {
        track(trackName, {
          cta_label: trackLabel,
          page_type: getPageType(window.location.pathname),
          page_path: window.location.pathname
        });
        return;
      }

      if (href.indexOf("tel:") === 0) {
        track("contact_click_phone", {
          contact_target: href.replace("tel:", ""),
          page_type: getPageType(window.location.pathname),
          page_path: window.location.pathname
        });
        return;
      }

      if (href.indexOf("mailto:") === 0) {
        track("contact_click_email", {
          contact_target: href.replace("mailto:", ""),
          page_type: getPageType(window.location.pathname),
          page_path: window.location.pathname
        });
        return;
      }

      if (/line\.me|lin\.ee/i.test(href)) {
        track("contact_click_line", {
          contact_target: href,
          page_type: getPageType(window.location.pathname),
          page_path: window.location.pathname
        });
      }
    });
  }

  function attachFormTracking() {
    var forms = document.querySelectorAll("form");
    if (!forms.length) return;

    Array.prototype.forEach.call(forms, function (form) {
      var tracked = false;
      form.addEventListener("submit", function () {
        tracked = true;
        track("lead_form_submit_attempt", {
          form_id: form.id || "unknown_form",
          page_type: getPageType(window.location.pathname),
          page_path: window.location.pathname
        });
      });

      var messageEl = document.getElementById("form-message");
      if (!messageEl) return;

      var observer = new MutationObserver(function () {
        var success = messageEl.querySelector(".success-message");
        var error = messageEl.querySelector(".error-message");

        if (success) {
          track("generate_lead", {
            form_id: form.id || "unknown_form",
            lead_type: "contact_form",
            page_type: getPageType(window.location.pathname),
            page_path: window.location.pathname
          });
        } else if (error && tracked) {
          track("lead_form_submit_error", {
            form_id: form.id || "unknown_form",
            page_type: getPageType(window.location.pathname),
            page_path: window.location.pathname
          });
        }
      });

      observer.observe(messageEl, {
        childList: true,
        subtree: true
      });
    });
  }

  function exposeTrackingHelpers() {
    window.WaytoTracking = {
      track: track
    };
  }

  initGA4();
  initGTM();
  exposeTrackingHelpers();
  attachCtaClickTracking();
  attachFormTracking();

  track("seo_tracking_ready", {
    page_type: getPageType(window.location.pathname),
    page_path: window.location.pathname
  });
})();
