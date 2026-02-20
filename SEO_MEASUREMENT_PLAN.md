# SEO 轉換追蹤規格（GA4 + GTM）

## 1) 追蹤目標

- 主要目標：自然搜尋帶來的有效詢問數（Organic Leads）。
- 次要目標：服務頁 CTA 點擊率、內容頁導流到服務頁的比例。

## 2) 事件命名規格

- `generate_lead`：表單成功送出（主要轉換）。
- `lead_form_submit_attempt`：使用者送出表單嘗試。
- `lead_form_submit_error`：表單送出失敗。
- `contact_click_phone`：點擊電話。
- `contact_click_email`：點擊 Email。
- `contact_click_line`：點擊 Line。
- `seo_tracking_ready`：頁面追蹤初始化。

## 3) 事件參數

- `page_type`：頁面類型（home、service_3d_overview、service_dev_overview、content...）。
- `page_path`：URL path。
- `form_id`：表單 ID。
- `lead_type`：固定填 `contact_form`。
- `contact_target`：電話號碼或 Email/Line URL。
- `cta_label`：CTA 文案。

## 4) GTM / GA4 實作流程

1. 建立 GA4 Property 與 Web Data Stream。
2. 建立 GTM Container 並將 `GTM-XXXXXXX` 填入 `window.WAYTO_SEO.gtmId`。
3. 將 `G-XXXXXXXXXX` 填入 `window.WAYTO_SEO.ga4Id`。
4. 在 GA4 中將 `generate_lead` 標記為轉換。
5. 在 GA4 建立探索報表：
   - 自然來源 `session default channel group = Organic Search`
   - 觀察 `generate_lead`、`contact_click_phone`。

## 5) 驗收清單

- 所有頁面載入可看到 `seo_tracking_ready`。
- 送出聯絡表單成功可看到 `generate_lead`。
- 點電話/Email/Line 皆有事件。
- GA4 Realtime 可看到事件流。

## 6) 專案設定方式

目前追蹤腳本在 `seo-tracking.js`，可在各頁面 head 內加入：

```html
<script>
  window.WAYTO_SEO = {
    ga4Id: "G-XXXXXXXXXX",
    gtmId: "GTM-XXXXXXX",
    debug: false
  };
</script>
<script src="seo-tracking.js" defer></script>
```
