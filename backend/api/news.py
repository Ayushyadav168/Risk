"""
News API — fetches from RSS feeds, caches in DB, serves with filters.
Sources: Economic Times, Livemint, Moneycontrol, NDTV Profit, Hindu BusinessLine + more.
"""
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import json, hashlib, re, os

from database import get_db, SessionLocal
import models
from auth import get_current_user

router = APIRouter()

# ── RSS Feed Registry ─────────────────────────────────────────────────────────
DEFAULT_FEEDS = [
    # ── Economic Times ────────────────────────────────────────────────────────
    {"name": "Economic Times — Markets",    "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",      "category": "markets"},
    {"name": "Economic Times — Economy",    "url": "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms", "category": "economy"},
    {"name": "Economic Times — Wealth",     "url": "https://economictimes.indiatimes.com/wealth/rssfeeds/837555174.cms",        "category": "finance"},
    {"name": "Economic Times — Top News",   "url": "https://economictimes.indiatimes.com/rssfeedsdefault.cms",                  "category": "business"},
    {"name": "ET Markets",                  "url": "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",  "category": "markets"},
    # ── Livemint ──────────────────────────────────────────────────────────────
    {"name": "Livemint — Markets",          "url": "https://www.livemint.com/rss/markets",                                      "category": "markets"},
    {"name": "Livemint — Money",            "url": "https://www.livemint.com/rss/money",                                        "category": "finance"},
    {"name": "Livemint — Companies",        "url": "https://www.livemint.com/rss/companies",                                    "category": "business"},
    {"name": "Livemint — Industry",         "url": "https://www.livemint.com/rss/industry",                                     "category": "business"},
    # ── Business Standard ─────────────────────────────────────────────────────
    {"name": "Business Standard — Markets", "url": "https://www.business-standard.com/rss/markets-106.rss",                     "category": "markets"},
    {"name": "Business Standard — Finance", "url": "https://www.business-standard.com/rss/finance-109.rss",                     "category": "finance"},
    {"name": "Business Standard — Economy", "url": "https://www.business-standard.com/rss/economy-102.rss",                     "category": "economy"},
    # ── Moneycontrol ──────────────────────────────────────────────────────────
    {"name": "Moneycontrol — Top News",     "url": "https://www.moneycontrol.com/rss/MCtopnews.xml",                            "category": "finance"},
    {"name": "Moneycontrol — Markets",      "url": "https://www.moneycontrol.com/rss/marketreports.xml",                        "category": "markets"},
    # ── NDTV Profit ───────────────────────────────────────────────────────────
    {"name": "NDTV Profit",                 "url": "https://feeds.feedburner.com/ndtvprofit-latest",                            "category": "business"},
    # ── Hindu BusinessLine ────────────────────────────────────────────────────
    {"name": "Hindu BusinessLine",          "url": "https://www.thehindubusinessline.com/feeder/default.rss",                   "category": "business"},
    # ── WSJ ───────────────────────────────────────────────────────────────────
    {"name": "WSJ — Markets",               "url": "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",                             "category": "markets"},
    {"name": "WSJ — Economy",               "url": "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",                          "category": "economy"},
    # ── The Economist ─────────────────────────────────────────────────────────
    {"name": "The Economist — Finance",     "url": "https://www.economist.com/finance-and-economics/rss.xml",                   "category": "finance"},
    {"name": "The Economist — Business",    "url": "https://www.economist.com/business/rss.xml",                                "category": "business"},
]

# ── Keyword → category detector ───────────────────────────────────────────────
CATEGORY_KEYWORDS = {
    "risk": [
        "risk", "npa", "fraud", "compliance", "regulation", "regulator", "rbi notice",
        "sebi", "penalty", "fine", "audit", "enforcement", "default", "write-off",
        "stress test", "credit risk", "liquidity", "operational risk",
    ],
    "markets": [
        "nifty", "sensex", "bse", "nse", "ipo", "stock", "equity", "share price",
        "mutual fund", "etf", "derivative", "futures", "options", "rally", "selloff",
        "market cap", "bull", "bear", "correction", "52-week",
    ],
    "finance": [
        "rbi", "interest rate", "repo rate", "inflation", "cpi", "wpi", "bond",
        "yield", "credit", "loan", "banking", "nbfc", "fintech", "payment",
        "upi", "neft", "forex", "rupee", "dollar", "gold price",
    ],
    "economy": [
        "gdp", "fiscal", "budget", "government", "ministry", "policy", "trade",
        "export", "import", "manufacturing", "pmi", "iip", "employment", "jobs",
        "infrastructure", "capex", "fdi", "fpi",
    ],
    "business": [
        "company", "earnings", "revenue", "profit", "loss", "merger", "acquisition",
        "startup", "unicorn", "ceo", "cfo", "quarterly results", "annual report",
        "dividend", "buyback", "ipo", "listing", "expansion",
    ],
}

def detect_category(title: str, summary: str) -> str:
    text = (title + " " + (summary or "")).lower()
    scores = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                scores[cat] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "business"

def extract_tags(title: str, summary: str) -> List[str]:
    """Extract meaningful tags from article text."""
    text = (title + " " + (summary or "")).lower()
    found = []
    all_kw = set()
    for kws in CATEGORY_KEYWORDS.values():
        all_kw.update(kws)
    # Common financial entities
    entities = [
        "rbi", "sebi", "nse", "bse", "nifty", "sensex", "upi", "ipo",
        "npa", "gdp", "cpi", "wpi", "fdi", "nbfc", "msme",
    ]
    for kw in entities:
        if kw in text:
            found.append(kw.upper())
    # Industry tags
    industries = ["banking", "fintech", "insurance", "real estate", "it sector",
                  "pharma", "fmcg", "auto", "energy", "telecom"]
    for ind in industries:
        if ind in text:
            found.append(ind.title())
    return list(dict.fromkeys(found))[:6]  # dedup, max 6

def clean_html(text: str) -> str:
    """Strip HTML tags and decode HTML entities from summary."""
    if not text:
        return ""
    import html
    clean = re.sub(r'<[^>]+>', '', text)
    clean = html.unescape(clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean[:400]

def clean_title(text: str) -> str:
    """Decode HTML entities from title."""
    if not text:
        return ""
    import html
    return html.unescape(text).strip()

def make_guid(url: str, title: str) -> str:
    return hashlib.md5(f"{url}:{title}".encode()).hexdigest()

# ── Core RSS Fetcher ──────────────────────────────────────────────────────────
def fetch_feed(feed_url: str, source_name: str, default_category: str, db: Session) -> int:
    """Fetch one RSS feed and upsert articles. Returns count of new articles."""
    try:
        import feedparser
        parsed = feedparser.parse(feed_url)
        new_count = 0

        for entry in parsed.entries:
            title = clean_title(entry.get("title", ""))
            url   = entry.get("link", "").strip()
            if not title or not url:
                continue

            # Summary: try different feedparser fields
            raw_summary = (
                entry.get("summary", "") or
                entry.get("description", "") or
                entry.get("content", [{}])[0].get("value", "") if entry.get("content") else ""
            )
            summary = clean_html(raw_summary)

            # Image: try media_thumbnail, media_content, enclosures
            image_url = None
            if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
                image_url = entry.media_thumbnail[0].get("url")
            elif hasattr(entry, "media_content") and entry.media_content:
                image_url = entry.media_content[0].get("url")
            elif entry.get("enclosures"):
                for enc in entry.enclosures:
                    if enc.get("type", "").startswith("image"):
                        image_url = enc.get("href")
                        break

            # Published date
            pub_at = None
            if entry.get("published_parsed"):
                try:
                    pub_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                except Exception:
                    pass
            if pub_at is None:
                pub_at = datetime.now(timezone.utc)

            # Category & tags
            category = detect_category(title, summary) or default_category
            tags = extract_tags(title, summary)
            guid = make_guid(url, title)

            # Upsert
            existing = db.query(models.NewsArticle).filter(models.NewsArticle.guid == guid).first()
            if existing:
                continue

            article = models.NewsArticle(
                guid=guid,
                title=title,
                summary=summary,
                url=url,
                image_url=image_url,
                source=source_name,
                category=category,
                tags=json.dumps(tags),
                published_at=pub_at,
                fetched_at=datetime.now(timezone.utc),
            )
            db.add(article)
            new_count += 1

        db.commit()
        return new_count

    except Exception as e:
        print(f"[News] Error fetching {feed_url}: {e}")
        db.rollback()
        return 0

def refresh_all_feeds(db: Session) -> dict:
    """Fetch all active sources and return stats."""
    sources = db.query(models.NewsSource).filter(models.NewsSource.is_active == True).all()
    total_new = 0
    results = []

    for src in sources:
        count = fetch_feed(src.rss_url, src.name, src.category, db)
        src.last_fetched_at = datetime.now(timezone.utc)
        src.article_count = db.query(models.NewsArticle).filter(
            models.NewsArticle.source == src.name
        ).count()
        db.commit()
        total_new += count
        results.append({"source": src.name, "new_articles": count})

    # Prune old articles (keep last 500)
    total = db.query(models.NewsArticle).count()
    if total > 500:
        oldest = (
            db.query(models.NewsArticle)
            .order_by(models.NewsArticle.published_at.asc())
            .limit(total - 500)
            .all()
        )
        for art in oldest:
            db.delete(art)
        db.commit()

    return {"total_new": total_new, "sources": results}

def _article_dict(a: models.NewsArticle) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "summary": a.summary,
        "url": a.url,
        "image_url": a.image_url,
        "source": a.source,
        "category": a.category,
        "tags": json.loads(a.tags) if a.tags else [],
        "published_at": a.published_at.isoformat() if a.published_at else None,
        "fetched_at": a.fetched_at.isoformat() if a.fetched_at else None,
        "is_featured": a.is_featured,
    }

# ── Full article content fetcher ──────────────────────────────────────────────
# Site-specific CSS selectors, ordered most-specific → generic
_CONTENT_SELECTORS = [
    # Economic Times
    "div.artText", ".story_details", "div[class*='artBody']",
    # Livemint
    ".contentSec", ".storyPage", ".story-details", ".premium-story",
    # Moneycontrol
    ".article_wrapper", ".arti-flow", ".article-content-detail",
    # NDTV Profit / NDTV
    ".sp-cn", ".story__content", ".content_text", ".post-content",
    # Hindu BusinessLine
    ".story-element", ".article-section", ".content-body",
    # Feedburner / generic
    "article", "[itemprop='articleBody']",
    ".article-body", ".article-content", ".entry-content",
    ".post-body", "main article", ".story-content",
]

_NOISE_SELECTORS = (
    "script,style,nav,header,footer,.advertisement,.ads,.sidebar,"
    ".related-articles,.social-share,form,iframe,noscript,.newsletter,"
    ".promo,.subscription,.paywall-message,.login-prompt,.comments"
)

def fetch_article_content(url: str) -> dict:
    """Fetch and extract full article content. Returns paragraphs + metadata."""
    import requests
    from bs4 import BeautifulSoup

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.google.com/",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=12, allow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Pull og:image before stripping tags
        og_image = None
        og = soup.find("meta", property="og:image")
        if og:
            og_image = og.get("content")

        # Pull og:description as a quality summary fallback
        og_desc = None
        og_d = soup.find("meta", property="og:description")
        if og_d:
            og_desc = og_d.get("content", "")

        # Remove noise elements
        for noise in soup.select(_NOISE_SELECTORS):
            noise.decompose()

        paragraphs = []

        # Try site-specific selectors
        for sel in _CONTENT_SELECTORS:
            el = soup.select_one(sel)
            if not el:
                continue
            raw = [
                tag.get_text(" ", strip=True)
                for tag in el.find_all(["p", "h2", "h3", "h4", "blockquote", "li"])
            ]
            cleaned = [t for t in raw if len(t) > 50]
            if len(cleaned) >= 3:
                paragraphs = cleaned
                break

        # Generic fallback — scrape all meaningful <p> from the page
        if not paragraphs:
            raw = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
            paragraphs = [t for t in raw if len(t) > 80]

        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for p in paragraphs:
            key = p[:60]
            if key not in seen:
                seen.add(key)
                deduped.append(p)

        success = len(deduped) >= 2
        return {
            "paragraphs": deduped[:35],
            "og_image": og_image,
            "og_description": og_desc,
            "success": success,
            "blocked": not success and resp.status_code == 200,
        }

    except requests.exceptions.Timeout:
        return {"paragraphs": [], "og_image": None, "og_description": None,
                "success": False, "blocked": False, "error": "Request timed out"}
    except requests.exceptions.HTTPError as e:
        return {"paragraphs": [], "og_image": None, "og_description": None,
                "success": False, "blocked": True, "error": str(e)}
    except Exception as e:
        return {"paragraphs": [], "og_image": None, "og_description": None,
                "success": False, "blocked": False, "error": str(e)}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
def get_news(
    category: Optional[str] = Query(None),        # finance|markets|risk|business|economy
    source: Optional[str] = Query(None),
    q: Optional[str] = Query(None),               # search query
    limit: int = Query(40, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.NewsArticle).order_by(models.NewsArticle.published_at.desc())

    if category and category != "all":
        query = query.filter(models.NewsArticle.category == category)
    if source:
        query = query.filter(models.NewsArticle.source == source)
    if q:
        pattern = f"%{q}%"
        query = query.filter(
            models.NewsArticle.title.ilike(pattern) |
            models.NewsArticle.summary.ilike(pattern) |
            models.NewsArticle.tags.ilike(pattern)
        )

    total = query.count()
    articles = query.offset(skip).limit(limit).all()

    return {
        "total": total,
        "articles": [_article_dict(a) for a in articles],
    }

@router.post("/refresh")
async def refresh_news(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Trigger immediate refresh of all feeds (runs in background)."""
    def _bg():
        bg_db = SessionLocal()
        try:
            refresh_all_feeds(bg_db)
        finally:
            bg_db.close()

    background_tasks.add_task(_bg)
    return {"message": "Refresh started in background"}

@router.post("/refresh/sync")
def refresh_news_sync(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Synchronous refresh — waits for completion and returns stats."""
    result = refresh_all_feeds(db)
    return result

@router.get("/sources")
def get_sources(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sources = db.query(models.NewsSource).order_by(models.NewsSource.name).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "rss_url": s.rss_url,
            "category": s.category,
            "is_active": s.is_active,
            "last_fetched_at": s.last_fetched_at.isoformat() if s.last_fetched_at else None,
            "article_count": s.article_count,
        }
        for s in sources
    ]

@router.put("/sources/{source_id}/toggle")
def toggle_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    src = db.query(models.NewsSource).filter(models.NewsSource.id == source_id).first()
    if not src:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Source not found")
    src.is_active = not src.is_active
    db.commit()
    return {"id": src.id, "name": src.name, "is_active": src.is_active}

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    total = db.query(models.NewsArticle).count()
    by_cat = {}
    for cat in ["finance", "markets", "risk", "business", "economy"]:
        by_cat[cat] = db.query(models.NewsArticle).filter(models.NewsArticle.category == cat).count()
    by_source = {}
    sources = db.query(models.NewsSource).all()
    for s in sources:
        by_source[s.name] = db.query(models.NewsArticle).filter(models.NewsArticle.source == s.name).count()
    latest = db.query(models.NewsArticle).order_by(models.NewsArticle.published_at.desc()).first()
    return {
        "total_articles": total,
        "by_category": by_cat,
        "by_source": by_source,
        "latest_article_at": latest.published_at.isoformat() if latest and latest.published_at else None,
    }

@router.get("/{article_id}/read")
def read_article(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch and return full article content for in-app reading."""
    from fastapi import HTTPException
    article = db.query(models.NewsArticle).filter(models.NewsArticle.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    content = fetch_article_content(article.url)

    # Use og:image to upgrade stored image if we don't have one
    if not article.image_url and content.get("og_image"):
        article.image_url = content["og_image"]
        db.commit()

    result = _article_dict(article)
    result["content"] = content
    return result


# ── Auto-refresh helper called from main.py startup ──────────────────────────
def seed_sources_and_initial_fetch():
    """Seed RSS sources and do first fetch. Called once at startup."""
    db = SessionLocal()
    try:
        # Upsert all DEFAULT_FEEDS — add any new ones not already in DB
        existing_urls = {s.rss_url for s in db.query(models.NewsSource).all()}
        new_added = 0
        for feed in DEFAULT_FEEDS:
            if feed["url"] not in existing_urls:
                db.add(models.NewsSource(
                    name=feed["name"],
                    rss_url=feed["url"],
                    category=feed["category"],
                    is_active=True,
                ))
                new_added += 1
        if new_added:
            db.commit()
            print(f"✅ Added {new_added} new news sources (total now {db.query(models.NewsSource).count()})")

        # Initial fetch if no articles yet
        article_count = db.query(models.NewsArticle).count()
        if article_count == 0:
            print("📰 Fetching initial news articles...")
            result = refresh_all_feeds(db)
            print(f"✅ Fetched {result['total_new']} articles from {len(result['sources'])} sources")
        else:
            # Check if last fetch was > 30 min ago — refresh if stale
            latest = db.query(models.NewsArticle).order_by(models.NewsArticle.fetched_at.desc()).first()
            if latest and latest.fetched_at:
                age = datetime.now(timezone.utc) - latest.fetched_at.replace(tzinfo=timezone.utc)
                if age > timedelta(minutes=30):
                    print(f"📰 News stale ({int(age.total_seconds()//60)}min) — refreshing...")
                    result = refresh_all_feeds(db)
                    print(f"✅ Refreshed: {result['total_new']} new articles")
                else:
                    print(f"✅ News cache fresh ({article_count} articles, {int(age.total_seconds()//60)}min old)")
    except Exception as e:
        print(f"News init error: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()
