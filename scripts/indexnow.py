"""通知 IndexNow（Bing、Yandex、Naver 等）網站有更新。

部署上線後執行：
    python scripts/indexnow.py                 # 送出 sitemap.xml 裡全部網址
    python scripts/indexnow.py /index.html ...  # 只送指定頁面

金鑰檔是網站根目錄的 <金鑰>.txt，內容就是金鑰本身；搜尋引擎會去抓它確認網站是我們的。
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOST = "wayto.com.tw"
KEY = "6ffdb943e6bfd5fbafcf97c0e2cecdd2"


def sitemap_urls() -> list[str]:
    xml = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    return re.findall(r"<loc>(https://wayto\.com\.tw/[^<]*)</loc>", xml)


def main() -> None:
    args = sys.argv[1:]
    urls = ["https://%s/%s" % (HOST, a.lstrip("/")) for a in args] if args else sitemap_urls()
    body = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": "https://%s/%s.txt" % (HOST, KEY),
        "urlList": urls,
    }).encode("utf-8")
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body,
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            # 200 = 已收到；202 = 已收到、還在驗證金鑰
            print("IndexNow %d：已送出 %d 個網址" % (res.status, len(urls)))
    except urllib.error.HTTPError as e:
        # 403 = 金鑰檔讀不到；422 = 網址不屬於這個網域；429 = 送太頻繁
        print("IndexNow %d：%s" % (e.code, e.read().decode("utf-8", "replace")[:300]))
        sys.exit(1)


if __name__ == "__main__":
    main()
