# GEO 監測表

更新日期：2026-10-31

這份文件用來追蹤 Wayto 在生成式搜尋中的可見度。建議每月執行一次，並記錄 AI 是否提到 Wayto、引用哪個頁面、競品是誰、回答是否準確。

## 每月固定測試問題

| 類別 | 測試問題 | 目標頁面 | 是否出現 Wayto | 引用頁面 | 競品 / 其他來源 | 備註 |
|---|---|---|---|---|---|---|
| 3D 視覺化 | 台灣有哪些 3D 繪圖或 3D 渲染公司？ | `3d-rendering-service.html` |  |  |  |  |
| 3D 視覺化 | 室內設計 3D 渲染報價怎麼算？ | `3d-rendering-service.html` |  |  |  |  |
| 3D 視覺化 | 台灣 3D 渲染公司推薦 | `3d-rendering-service.html` |  |  |  |  |
| 3D 視覺化 | 3D 渲染報價怎麼算？ | `3d-rendering-cost.html` |  |  |  |  |
| 建案銷售 | 建案銷售中心互動展示可以怎麼做？ | `property-sales-3d.html` |  |  |  |  |
| 建案銷售 | 虛擬樣品屋適合預售屋銷售嗎？ | `property-sales-3d.html` |  |  |  |  |
| 建案銷售 | 建案電子展板和 3D 導覽有什麼差別？ | `property-sales-3d.html` |  |  |  |  |
| 系統開發 | 客製化系統開發公司怎麼選？ | `custom-system-development.html` |  |  |  |  |
| 系統開發 | 工程管理系統跟 Excel 差在哪？ | `custom-system-development.html` |  |  |  |  |
| 系統開發 | 台灣客製系統開發公司推薦 | `custom-system-development.html` |  |  |  |  |
| 系統開發 | 客製系統開發費用怎麼估？ | `custom-system-development-cost.html` |  |  |  |  |
| 展覽互動 | 展覽互動展示怎麼規劃？ | `interactive-exhibition.html` |  |  |  |  |
| 展覽互動 | 建材品牌如何在展場展示產品效果？ | `interactive-exhibition.html` |  |  |  |  |
| 展覽互動 | 展場互動展示可以離線運行嗎？ | `interactive-exhibition.html` |  |  |  |  |
| 服務範圍 | 台灣哪些公司提供建案 3D 展示與互動展示？ | `property-sales-3d.html` |  |  |  |  |
| 服務範圍 | 台灣哪些公司提供展覽互動展示規劃？ | `interactive-exhibition.html` |  |  |  |  |
| 建案銷售 | 預售屋官網怎麼讓客戶感受空間、周邊與日照？ | `property-showcase.html` |  |  |  |  |
| 建案銷售 | 有沒有做沉浸式建案網站的公司？ | `property-showcase.html` |  |  |  |  |
| 設計提案 | 室內設計提案怎麼呈現比較有說服力？ | `design-showcase.html` |  |  |  |  |
| 展覽互動 | 建材品牌怎麼讓客戶在展場親手試材質？ | `brand-showcase.html` |  |  |  |  |
| 展覽互動 | 室內照片可以用 AI 換牆面或地板嗎？ | `renderease.html` |  |  |  |  |
| 社團 / 活動 | 社團管理系統推薦 | `rotaract.html` |  |  |  |  |
| 社團 / 活動 | 商會或協會的活動報名、餐點、簽到怎麼管理？ | `herchu.html` |  |  |  |  |
| 空間租借 | 空間租借系統推薦（預約、付款、門鎖） | `spaceease.html` |  |  |  |  |
| 系統開發 | 加盟展店提案可以怎麼加快？ | `case-study-bocchi.html` |  |  |  |  |

## 測試平台

- ChatGPT Search / browsing mode
- Perplexity
- Google AI Overviews / AI Mode
- Gemini
- Claude with web search

## 判讀方式

| 狀態 | 定義 | 下月動作 |
|---|---|---|
| 出現且引用正確 | 回答中提到 Wayto，並引用正確頁面 | 補案例與外部引用，提高穩定度 |
| 出現但描述不完整 | 有提到 Wayto，但服務、地點或案例說錯 | 強化 `ai-search-guide.html`、`llms.txt` 與對應頁 FAQ |
| 沒出現但競品出現 | AI 引用其他公司或平台 | 分析競品被引用來源，補外部權威訊號與內容缺口 |
| 沒出現且回答泛泛 | AI 沒有列公司，只給一般建議 | 增加問題型內容與案例證據 |

## 每月紀錄

### 2026-10-31（第一次基準）

- 測試平台：網路搜尋（美國索引，非台灣 Google）。Perplexity 要求「驗證您是人類」，未測；ChatGPT、Gemini、Google AI 模式待人工測。
- 本月 Wayto 出現次數：0 / 7（連直接搜「維次元宇宙科技 Wayto」都沒出現，只找到名字相近的其他公司）。
- 各題結果：
  - 3D 繪圖公司 推薦（台中）：前排全是 PRO360 媒合平台的業者服務頁。
  - 建案銷售中心互動展示：只有國外廠商（Intuiface、SmartPixel、VR Builders），沒有台灣業者。
  - 客製化系統開發公司（台中）：PRO360 業者頁為主。
  - 社團管理系統推薦：學校內部系統、競賽文件與國外產品，沒有台灣產品頁。
  - 空間租借系統（預約、付款、電子鎖）：國外外掛與專利，沒有中文產品。
  - 建材品牌展場互動：國外案例（IKEA、Owens Corning、Rockwool）。
- 判讀：網站在非 Google 索引幾乎沒有被收錄（品牌名都查不到）；多數題目沒有台灣在地答案，代表內容有機會，但要先被收錄。
- 下月要做：
  - 上線後送 IndexNow（`python scripts/indexnow.py`），並在 Bing Webmaster Tools 驗證網站。
  - 在 PRO360 等 AI 會引用的台灣平台建立公司／服務頁，連回官網。
  - 社團、空間租借、沉浸式建案網站這幾題目前沒有台灣答案，優先寫第二批指南頁。

## 每月紀錄格式

### 2026-__-__

- 測試平台：
- 本月 Wayto 出現次數：
- 最常被引用頁面：
- 競品 / 其他來源：
- AI 誤解或漏掉的資訊：
- 下月要新增或修改的內容：
