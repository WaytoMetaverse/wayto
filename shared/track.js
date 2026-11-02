/*
 * 全站轉換追蹤。GA4 已在各頁 <head> 載入；這裡補上：
 *   - Google Ads、Meta Pixel（CONFIG 的 ID 留空就不載入）
 *   - 詢問相關事件（命名對齊 SEO_MEASUREMENT_PLAN.md）：點電話／Email／LINE、表單送出、看完沉浸式展示
 *   - 記住最後一次外部進站來源（廣告、搜尋、其他網站），表單送出時一併寄給業務
 * 表單頁用 window.waytoTrack.lead() / .event() / .source()。
 */
(function () {
  var CONFIG = {
    googleAdsId: "",           // 例：AW-123456789
    googleAdsLeadLabel: "",    // 「表單送出」轉換動作的標籤（send_to 斜線後那段）
    googleAdsContactLabel: "", // 「點電話／LINE／Email」轉換動作的標籤（選填）
    metaPixelId: "1834649004333004" // 事件管理工具「Wayto 官網」；自動進階配對保持關閉
  };

  var SOURCE_KEY = "wayto_src";
  var SOURCE_DAYS = 90;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) window.gtag = function () { window.dataLayer.push(arguments); };
  var gtag = window.gtag;

  if (CONFIG.googleAdsId) gtag("config", CONFIG.googleAdsId);

  if (CONFIG.metaPixelId && !window.fbq) {
    var fbq = (window.fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    });
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    var px = document.createElement("script");
    px.async = true;
    px.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(px);
    fbq("init", CONFIG.metaPixelId);
    fbq("track", "PageView");
  }

  function pixel() {
    if (CONFIG.metaPixelId && window.fbq) window.fbq.apply(null, arguments);
  }

  function adsConversion(label) {
    if (CONFIG.googleAdsId && label) gtag("event", "conversion", { send_to: CONFIG.googleAdsId + "/" + label });
  }

  function event(name, params) {
    var p = Object.assign({ page_path: location.pathname }, params);
    gtag("event", name, p);
  }

  // 只有帶廣告參數或從別的網站點進來才覆寫；直接打網址、站內換頁都保留上一次的來源
  function captureSource() {
    var q = new URLSearchParams(location.search);
    var src = {};
    ["source", "medium", "campaign", "term", "content"].forEach(function (k) {
      var v = q.get("utm_" + k);
      if (v) src[k] = v.slice(0, 100);
    });
    if (q.has("gclid") || q.has("gbraid") || q.has("wbraid")) src.click = "google_ads";
    else if (q.has("fbclid")) src.click = "fb";
    var ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
    var external = ref && ref.replace(/^www\./, "") !== location.hostname.replace(/^www\./, "");
    if (!Object.keys(src).length && !external) return;
    src.referrer = external ? ref : "";
    src.landing = location.pathname;
    src.at = Date.now();
    try { localStorage.setItem(SOURCE_KEY, JSON.stringify(src)); } catch (e) {}
  }

  function source() {
    try {
      var s = JSON.parse(localStorage.getItem(SOURCE_KEY));
      if (s && Date.now() - s.at < SOURCE_DAYS * 864e5) return s;
    } catch (e) {}
    return null;
  }

  function lead(params) {
    event("generate_lead", params);
    adsConversion(CONFIG.googleAdsLeadLabel);
    pixel("track", "Lead", { content_category: (params && params.lead_topic) || "" });
  }

  captureSource();

  // 電話／Email／LINE（頁尾是 JS 載入的，所以掛在 document 上）
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var kind = /^tel:/i.test(href) ? "phone"
      : /^mailto:/i.test(href) ? "email"
      : /\/\/(line\.me|lin\.ee)\//i.test(href) ? "line" : "";
    if (!kind) return;
    event("contact_click_" + kind, {
      contact_target: href.replace(/^(tel|mailto):/i, "").split("?")[0],
      link_area: a.closest("#shared-footer") ? "footer" : a.closest("#shared-nav") ? "nav" : "content"
    });
    adsConversion(CONFIG.googleAdsContactLabel);
    pixel("track", "Contact");
  }, true);

  // 四個宇宙展示頁：捲到最後的 CTA 區＝看完整段體驗（可拿來做再行銷名單）
  var cta = document.querySelector(".ps-cta");
  if (cta && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var universe = document.body.getAttribute("data-universe") || "";
      event("showcase_complete", { universe: universe });
      pixel("track", "ViewContent", { content_name: universe + "_showcase" });
    }, { threshold: 0.3 });
    io.observe(cta);
  }

  window.waytoTrack = { event: event, lead: lead, source: source };
})();
