import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

LAYOUT_LINK = '  <link rel="stylesheet" href="/wayto1/shared/layout.css">\n'
LAYOUT_SCRIPT = '  <script src="/wayto1/shared/layout-root.js"></script>\n'


def ensure_layout_link(html: str) -> str:
    if "/wayto1/shared/layout.css" in html:
        return html
    return html.replace("</head>", LAYOUT_LINK + "</head>", 1)


def ensure_layout_script(html: str) -> str:
    if "layout-root.js" in html:
        return html
    return html.replace("</body>", LAYOUT_SCRIPT + "</body>", 1)


def add_body_attrs(html: str, nav_current: str) -> str:
    def repl(match: re.Match) -> str:
        attrs = match.group(1)
        if "wayto-has-shared-nav" not in attrs:
            if 'class="' in attrs:
                attrs = re.sub(
                    r'class="([^"]*)"',
                    r'class="wayto-has-shared-nav \1"',
                    attrs,
                    count=1,
                )
            else:
                attrs += ' class="wayto-has-shared-nav"'
        if "data-nav-current" not in attrs:
            attrs += f' data-nav-current="{nav_current}"'
        return f"<body{attrs}>"

    return re.sub(r"<body([^>]*)>", repl, html, count=1)


def replace_standard_nav(html: str) -> str:
    return re.sub(
        r"<!-- Navigation -->.*?(?=<!-- Main Content -->)",
        '<div id="shared-nav"></div>\n\n  <!-- Main Content -->',
        html,
        count=1,
        flags=re.DOTALL,
    )


def replace_tech_nav(html: str) -> str:
    return re.sub(
        r"<!-- 導航列 -->.*?(?=<!-- Hero 區 -->)",
        '<div id="shared-nav"></div>\n\n   <!-- Hero 區 -->',
        html,
        count=1,
        flags=re.DOTALL,
    )


def replace_footer(html: str) -> str:
    return re.sub(
        r"<!-- Footer -->.*?</footer>\s*",
        "",
        html,
        count=1,
        flags=re.DOTALL,
    )


def add_shared_footer(html: str) -> str:
    if 'id="shared-footer"' in html:
        return html
    return html.replace("</body>", '  <div id="shared-footer"></div>\n</body>')


def update_tailwind_page(name: str, nav_current: str) -> None:
    path = ROOT / name
    html = path.read_text(encoding="utf-8")
    html = ensure_layout_link(html)
    if name == "tech.html":
        html = replace_tech_nav(html)
    else:
        html = replace_standard_nav(html)
    html = add_body_attrs(html, nav_current)
    html = html.replace('<main class="h-full pt-24">', '<main class="h-full">')
    html = html.replace('class="relative pt-20 sm:pt-24"', 'class="relative"')
    html = replace_footer(html)
    html = add_shared_footer(html)
    html = ensure_layout_script(html)
    path.write_text(html, encoding="utf-8", newline="\n")
    print("Updated", name)


def update_simple_page(name: str) -> None:
    path = ROOT / name
    html = path.read_text(encoding="utf-8")
    html = ensure_layout_link(html)
    html = add_body_attrs(html, "")
    if 'id="shared-nav"' not in html:
        html = re.sub(
            r"<body[^>]*>",
            lambda m: m.group(0).replace(">", ">\n  <div id=\"shared-nav\"></div>\n", 1),
            html,
            count=1,
        )
    html = add_shared_footer(html)
    html = ensure_layout_script(html)
    path.write_text(html, encoding="utf-8", newline="\n")
    print("Updated", name)


def main() -> None:
    pages = {
        "services.html": "solutions",
        "process.html": "faq",
        "portfolio.html": "cases",
        "visual.html": "home",
        "tech.html": "solutions",
    }
    for name, nav in pages.items():
        update_tailwind_page(name, nav)

    for name in [
        "insights.html",
        "article-3d-rendering-cost-taiwan.html",
        "article-custom-website-development-cost.html",
        "service-3d-modeling-rendering.html",
        "service-custom-website-development.html",
        "case-study-enterprise-site-revamp.html",
    ]:
        update_simple_page(name)


if __name__ == "__main__":
    main()
