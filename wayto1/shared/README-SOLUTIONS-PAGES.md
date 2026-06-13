# 解決方案頁（金色線）

## 檔案

| 檔案 | 用途 |
|------|------|
| `layout.css` | 全站導覽、頁尾、`--layout-max` |
| `solutions.css` | 方案線共用版型、金色 token、Hero / section / CTA |
| `solution-page.template.html`（`wayto1/` 根目錄） | 新頁母版（複製同層後改名） |
| `solutions-property-sales.html` | **建案銷售**方案頁（3D／互動樣屋／行銷延伸） |
| `solutions-design-proposal.html` | **設計提案**方案頁 |
| `solutions-exhibition.html` | **展覽互動**方案頁 |
| `preview-viewer-space-solutions.html` | 舊網址保留：自動導向 `solutions-design-proposal.html` |

## 新頁檢查清單

1. `<body class="wayto-has-shared-nav sol-page" data-nav-current="solutions">` — `data-nav-current` 須與 `nav.html` 裡對應項目的 `data-nav-page` 一致。
2. CSS 順序：`layout.css` → `solutions.css` → 頁內極少量覆寫。
3. 主寬度：使用 `.container`（已吃 `var(--layout-max)`），勿另寫第三種 max-width。
4. 底欄 CTA 圖：在該頁 `<style>` 寫 `#底欄區塊id.foot-cta::before { background-image: url('uploads/your-bg.png'); }`（與該 HTML 同層的 `uploads/`）。勿只設 `:root` 的 `--sol-foot-cta-bg-image`，否則相對路徑會以 `shared/solutions.css` 為基準而 404。
5. 僅供預覽的黃色 banner：勿上正式站；建議檔名 `preview-*.html` 或建置時排除。

## 瀏覽器

試算區 `.room-cell:has(input:checked)` 等需支援 `:has()` 的瀏覽器；舊版 Safari 可能需日後以 class 或 JS 補強。

## 連結維護

導覽與頁尾的「解決方案」「案例」連結集中在 `nav.html`、`footer.html`；新增正式方案頁後請一併更新對應 href。
