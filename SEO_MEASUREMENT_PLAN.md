# 轉換追蹤規格（GA4＋廣告）

## 1) 追蹤目標

- 主要目標：有效詢問數（聯絡表單送出），自然搜尋與廣告都算。
- 次要目標：點電話／Email／LINE、看完四個宇宙展示頁（可做再行銷名單）。

## 2) 架構

| 檔案 | 作用 |
|---|---|
| 各頁 `<head>` 的 gtag 片段 | GA4（`G-F1SWCVSH9F`） |
| `shared/track.js` | 事件、Google Ads／Meta Pixel（ID 填在檔案上方 `CONFIG`，留空就不載入）、記住廣告來源 |
| `api/contact.js` | Vercel 函式：聯絡表單 POST 到 `/api/contact`，透過 Resend 寄到公司信箱 |
| `contact.html` | 表單送出：成功才記 `generate_lead`；寄信服務沒設定或失敗時，改開郵件程式（mailto），需求不會遺失。網址帶 `?topic=design`／`exhibition`／`system` 時預選對應主題（`lead_topic` 跟著變），沒帶就是「建案展示」 |

- `track.js` 被快取一年：改了內容要把全部頁面的 `?v=track-20261102` 一起改版本號。
- 舊的 `seo-tracking.js` 沒有任何頁面載入，已不使用。

## 3) 事件

| 事件 | 時機 | 參數 |
|---|---|---|
| `generate_lead` | 表單線上送出成功（主要轉換） | `form_id`、`lead_type`=`contact_form`、`lead_topic` |
| `lead_form_submit_attempt` | 按下送出 | 同上 |
| `lead_form_submit_error` | 線上送出失敗、改開郵件程式 | 同上＋`error_reason`（HTTP 狀態，`503`＝寄信服務沒設定） |
| `contact_click_phone` / `_email` / `_line` | 點電話、Email、LINE 連結 | `contact_target`、`link_area`（footer／nav／content） |
| `showcase_complete` | 展示頁捲到最後的 CTA 區 | `universe`（estate／design／brand／enterprise） |

所有事件都帶 `page_path`。Google Ads 在 `generate_lead` 時送「表單」轉換、點聯絡方式時送「聯絡」轉換（有填標籤才送）；Meta 對應 `Lead`、`Contact`、`ViewContent`。

**隱私**：表單上寫「不會提供第三方使用」，所以沒有把姓名／Email／電話傳給 Google 或 Meta（沒開強化轉換、進階比對）。要開的話先改隱私說明。

## 4) 廣告來源

`track.js` 在網址帶 `utm_*`、`gclid`（Google 廣告自動標記）、`fbclid`，或從別的網站點進來時，把來源記在瀏覽器 90 天；直接打網址、站內換頁不會覆蓋。表單送出時，信裡會多一行【來源】，例如：

```
【來源】Google 廣告點擊｜google / cpc｜活動：estate-search｜關鍵字：建案VR｜進站頁 /solutions-property-sales.html
```

廣告的到達網址建議加上 UTM：

- Google：開啟帳戶的「自動標記」即可；要分活動再加 `?utm_source=google&utm_medium=cpc&utm_campaign=活動名稱&utm_term={keyword}`
- Meta：`?utm_source=facebook&utm_medium=paid&utm_campaign=活動名稱&utm_content=素材名稱`

## 5) 上線設定（要到各後台操作）

### A. 表單寄信（Resend）— 必做，沒做之前表單仍是開郵件程式

1. 用 `wayto.metaverse@gmail.com` 註冊 resend.com。
2. API Keys → 建立一把金鑰（權限選 Sending access）。
3. Vercel 專案 → Settings → Environment Variables，新增 `RESEND_API_KEY`（Production、Preview 都勾）。
4. Deployments → 最新一次 → Redeploy。
5. 到官網送一筆測試，確認信箱收到、按「回覆」會回給填表的人。

選用：Resend 驗證 `wayto.com.tw` 網域（加 DNS 紀錄）後，可設 `CONTACT_FROM`（例：`Wayto 官網 <noreply@wayto.com.tw>`）；`CONTACT_TO` 可設多個收件人，用逗號分隔。沒驗證網域前，寄件人只能是 `onboarding@resend.dev`，而且只能寄給註冊 Resend 的那個信箱。

### B. GA4

1. 管理 → 資料顯示 → 事件：等 `generate_lead` 出現後，標成「重要事件」。（已完成）
2. 需要的話，把 `contact_click_phone`、`contact_click_line` 也標成重要事件。
3. 目標對象（2026-11-02 已建）：看完展示頁（`showcase_complete`，180 天）、看過展示頁（網址含 `showcase`，180 天）、建案頁訪客（網址含 `property`，180 天）、進過聯絡頁但沒送出（網址含 `contact`、永久排除 `generate_lead`，30 天）。要給 Google Ads 用，GA4「產品連結 → Google Ads 連結」的「個人化廣告」必須開啟。

### C. Google Ads（二選一）

- **簡單**：Google Ads 連結 GA4 → 目標 → 轉換 → 匯入 GA4 的 `generate_lead`。不用改程式。
- **較準**：建立「網站」轉換動作（手動用程式碼）→ 取得 `AW-XXXXXXXXX` 與標籤 → 填進 `track.js` 的 `googleAdsId`、`googleAdsLeadLabel`（點聯絡方式的轉換填 `googleAdsContactLabel`）→ 改版本號 → 部署。

目前採用「簡單」：帳戶 804-343-1899 已從 GA4 匯入「wayto (web) generate_lead」當主要轉換（2026-11-02）。帳戶裡另一個「Lead form - Submit」是 Google 代管表單素材用的，不是官網表單。

### D. Meta Pixel

事件管理工具 → 連結資料來源 → 網站 → 取得 Pixel（資料集）ID → 填 `metaPixelId` → 改版本號 → 部署。

已設定：資料集「Wayto 官網」`1834649004333004`（2026-11-02）。「自動進階配對」、「無須程式碼即可自動追蹤事件」都保持關閉，Pixel 只收到頁面網址與 `Lead`／`Contact`／`ViewContent` 事件，不含表單個資。

自訂受眾（2026-11-02 已建，都保留 180 天）：官網所有訪客、看完展示頁（`ViewContent`）、建案頁訪客（網址含 `property`）。

## 6) 驗收清單

- [ ] 送出測試表單：信箱收到信、信裡有【來源】，畫面顯示「已收到您的需求」。
- [ ] GA4 即時報表看得到 `generate_lead`。
- [ ] 點頁尾 LINE、Email 有 `contact_click_*`。
- [ ] 展示頁捲到底有 `showcase_complete`。
- [ ] 填了 Ads／Pixel ID 後：Google 代碼助理、Meta Pixel Helper 看得到轉換觸發。
