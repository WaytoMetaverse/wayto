/*
 * 官網聯絡表單：POST /api/contact → 透過 Resend 寄到公司信箱。
 * Vercel 環境變數：
 *   RESEND_API_KEY  必填；沒設定時回 503，前端會改用郵件程式（mailto）送出
 *   CONTACT_TO      收件人，逗號分隔，預設公司 Gmail
 *   CONTACT_FROM    寄件人；Resend 驗證 wayto.com.tw 網域前只能用 onboarding@resend.dev，
 *                   而且只能寄給註冊 Resend 的那個信箱
 */
const DEFAULT_TO = "wayto.metaverse@gmail.com";
const DEFAULT_FROM = "Wayto 官網 <onboarding@resend.dev>";

const LIMITS = { topic: 40, company: 120, name: 80, phone: 40, email: 160, project: 160, message: 4000 };
const SOURCE_KEYS = ["source", "medium", "campaign", "term", "content", "click", "referrer", "landing"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return String(value == null ? "" : value).replace(/\r\n?/g, "\n").trim().slice(0, max);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function parseBody(body) {
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  try {
    return JSON.parse(String(body || "{}"));
  } catch (e) {
    return {};
  }
}

// 廣告來源（shared/track.js 記錄的最後一次外部進站）→ 一行好讀的說明
function describeSource(raw) {
  if (!raw || typeof raw !== "object") return "直接進站或無紀錄";
  const s = {};
  SOURCE_KEYS.forEach((k) => { s[k] = clean(raw[k], 200); });
  const parts = [];
  if (s.click === "google_ads") parts.push("Google 廣告點擊");
  if (s.click === "fb") parts.push("Facebook / Instagram 連結");
  if (s.source || s.medium) parts.push([s.source, s.medium].filter(Boolean).join(" / "));
  if (s.campaign) parts.push("活動：" + s.campaign);
  if (s.term) parts.push("關鍵字：" + s.term);
  if (s.content) parts.push("素材：" + s.content);
  if (s.referrer) parts.push("來自 " + s.referrer);
  if (s.landing) parts.push("進站頁 " + s.landing);
  return parts.length ? parts.join("｜") : "直接進站或無紀錄";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // 只收自己網站送出的表單
  const origin = req.headers.origin;
  if (origin && origin.replace(/^https?:\/\//, "") !== req.headers.host) {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }

  const body = parseBody(req.body);

  // 隱藏欄位有值＝機器人，假裝成功、不寄信
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  const data = {};
  Object.keys(LIMITS).forEach((k) => { data[k] = clean(body[k], LIMITS[k]); });
  if (!data.name || !EMAIL_RE.test(data.email)) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(503).json({ ok: false, error: "not_configured" });

  const source = describeSource(body.source);
  const rows = [
    ["諮詢主題", data.topic || "—"],
    ["公司", data.company || "—"],
    ["聯絡人", data.name],
    ["電話", data.phone || "—"],
    ["Email", data.email],
    ["專案名稱", data.project || "—"],
    ["來源", source]
  ];
  const text = rows.map(([k, v]) => "【" + k + "】" + v).join("\n") + "\n\n【需求說明】\n" + (data.message || "—");
  const html =
    '<table style="border-collapse:collapse;font:14px/1.6 sans-serif">' +
    rows.map(([k, v]) =>
      '<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#666;white-space:nowrap">' + k +
      '</th><td style="padding:4px 0">' + escapeHtml(v) + "</td></tr>"
    ).join("") +
    '</table><p style="font:14px/1.6 sans-serif;color:#666;margin:16px 0 4px">需求說明</p>' +
    '<p style="font:14px/1.7 sans-serif;white-space:pre-wrap;margin:0">' + escapeHtml(data.message || "—") + "</p>";
  const subject = ("官網諮詢：" + (data.topic || "未選主題") + "｜" + (data.company || data.name)).replace(/\s+/g, " ");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || DEFAULT_FROM,
        to: (process.env.CONTACT_TO || DEFAULT_TO).split(",").map((s) => s.trim()).filter(Boolean),
        reply_to: data.email,
        subject,
        text,
        html
      })
    });
    if (!r.ok) {
      console.error("resend failed", r.status, (await r.text()).slice(0, 500));
      return res.status(502).json({ ok: false, error: "send_failed" });
    }
  } catch (e) {
    console.error("resend error", e && e.message);
    return res.status(502).json({ ok: false, error: "send_failed" });
  }

  return res.status(200).json({ ok: true });
};
