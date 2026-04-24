from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
import json, re, os

from database import get_db
import models
from auth import get_current_user

router = APIRouter()

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class CompanyCreate(BaseModel):
    name: str
    ticker: Optional[str] = None
    exchange: Optional[str] = "NSE"
    is_listed: bool = False
    industry: Optional[str] = None
    sector: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    market_cap: Optional[float] = None
    current_price: Optional[float] = None
    revenue: Optional[float] = None
    net_profit: Optional[float] = None
    total_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    equity: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    eps: Optional[float] = None

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    market_cap: Optional[float] = None
    current_price: Optional[float] = None
    revenue: Optional[float] = None
    net_profit: Optional[float] = None
    total_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    equity: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    debt_to_equity: Optional[float] = None
    current_ratio: Optional[float] = None
    balance_sheet: Optional[dict] = None
    income_statement: Optional[dict] = None

def _company_dict(c: models.Company) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "ticker": c.ticker,
        "exchange": c.exchange,
        "is_listed": c.is_listed,
        "industry": c.industry,
        "sector": c.sector,
        "website": c.website,
        "description": c.description,
        "market_cap": c.market_cap,
        "current_price": c.current_price,
        "revenue": c.revenue,
        "net_profit": c.net_profit,
        "total_assets": c.total_assets,
        "total_liabilities": c.total_liabilities,
        "equity": c.equity,
        "pe_ratio": c.pe_ratio,
        "pb_ratio": c.pb_ratio,
        "roe": c.roe,
        "roce": c.roce,
        "debt_to_equity": c.debt_to_equity,
        "current_ratio": c.current_ratio,
        "dividend_yield": c.dividend_yield,
        "eps": c.eps,
        "face_value": c.face_value,
        "balance_sheet": json.loads(c.balance_sheet) if c.balance_sheet else None,
        "income_statement": json.loads(c.income_statement) if c.income_statement else None,
        "cash_flow_data": json.loads(c.cash_flow_data) if c.cash_flow_data else None,
        "quarterly_results": json.loads(c.quarterly_results) if c.quarterly_results else None,
        "strengths": json.loads(c.strengths) if c.strengths else [],
        "weaknesses": json.loads(c.weaknesses) if c.weaknesses else [],
        "opportunities": json.loads(c.opportunities) if c.opportunities else [],
        "threats": json.loads(c.threats) if c.threats else [],
        "ai_analysis": c.ai_analysis,
        "risk_score": c.risk_score,
        "growth_score": c.growth_score,
        "data_source": c.data_source,
        "last_fetched_at": c.last_fetched_at.isoformat() if c.last_fetched_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }

# ── Screener.in Scraper ───────────────────────────────────────────────────────
def _parse_number(text: str) -> Optional[float]:
    """Parse numbers like '1,23,456.78 Cr' → float"""
    if not text:
        return None
    text = text.strip().replace(',', '')
    # Remove units
    for unit in [' Cr', ' L', ' %', '%', ' ₹', '₹', ' Rs', 'Rs']:
        text = text.replace(unit, '')
    text = text.strip()
    try:
        return float(text)
    except:
        return None

def fetch_screener_data(ticker: str) -> dict:
    """Scrape Screener.in for listed company data."""
    try:
        import requests
        from bs4 import BeautifulSoup

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

        url = f"https://www.screener.in/company/{ticker.upper()}/consolidated/"
        resp = requests.get(url, headers=headers, timeout=15)

        if resp.status_code == 404:
            # Try non-consolidated
            url = f"https://www.screener.in/company/{ticker.upper()}/"
            resp = requests.get(url, headers=headers, timeout=15)

        if resp.status_code != 200:
            return {"error": f"Could not fetch data for {ticker}. Status: {resp.status_code}"}

        soup = BeautifulSoup(resp.text, 'html.parser')
        data = {}

        # Company name
        h1 = soup.find('h1', class_='h2')
        if h1:
            data['name'] = h1.get_text(strip=True)

        # Company description
        desc_div = soup.find('div', class_='company-profile')
        if desc_div:
            p = desc_div.find('p')
            if p:
                data['description'] = p.get_text(strip=True)[:500]

        # Key ratios section
        ratios_section = soup.find('ul', id='top-ratios')
        if ratios_section:
            for li in ratios_section.find_all('li'):
                name_span = li.find('span', class_='name')
                value_span = li.find('span', class_='number')
                if not name_span or not value_span:
                    continue
                name = name_span.get_text(strip=True).lower()
                value_text = value_span.get_text(strip=True)
                value = _parse_number(value_text)

                if 'market cap' in name:
                    data['market_cap'] = value
                elif 'current price' in name or 'stock p/e' not in name and 'price' in name:
                    if 'current_price' not in data:
                        data['current_price'] = value
                elif 'stock p/e' in name or 'p/e' == name:
                    data['pe_ratio'] = value
                elif 'p/b' in name or 'price to book' in name:
                    data['pb_ratio'] = value
                elif 'dividend yield' in name:
                    data['dividend_yield'] = value
                elif 'roce' in name:
                    data['roce'] = value
                elif 'roe' in name:
                    data['roe'] = value
                elif 'face value' in name:
                    data['face_value'] = value
                elif 'eps' in name:
                    data['eps'] = value
                elif 'debt' in name:
                    data['debt_to_equity'] = value

        # Pros and Cons (strengths/weaknesses)
        pros = []
        cons = []

        analysis_section = soup.find('div', class_='analysis-container') or soup.find('section', id='analysis')
        if not analysis_section:
            # Try finding by text
            for section in soup.find_all('section'):
                h2 = section.find(['h2','h3'])
                if h2 and 'pros' in h2.get_text(strip=True).lower():
                    analysis_section = section
                    break

        # Look for pros/cons divs
        for div in soup.find_all('div', class_='pros-cons') or []:
            pros_div = div.find('div', class_='pros')
            cons_div = div.find('div', class_='cons')
            if pros_div:
                pros = [li.get_text(strip=True) for li in pros_div.find_all('li')]
            if cons_div:
                cons = [li.get_text(strip=True) for li in cons_div.find_all('li')]

        # Alternative: look for any ul with class containing pros/cons
        if not pros:
            pros_ul = soup.find('ul', class_=lambda c: c and 'pros' in c.lower() if c else False)
            if pros_ul:
                pros = [li.get_text(strip=True) for li in pros_ul.find_all('li')][:5]

        if not cons:
            cons_ul = soup.find('ul', class_=lambda c: c and 'cons' in c.lower() if c else False)
            if cons_ul:
                cons = [li.get_text(strip=True) for li in cons_ul.find_all('li')][:5]

        data['strengths'] = pros
        data['weaknesses'] = cons

        # Financial tables - Income Statement
        income_data = {"years": [], "revenue": [], "profit": [], "ebitda": []}

        # Find profit and loss table
        pl_section = soup.find('section', id='profit-loss')
        if pl_section:
            table = pl_section.find('table')
            if table:
                headers_row = table.find('thead')
                if headers_row:
                    years = [th.get_text(strip=True) for th in headers_row.find_all('th')][1:]
                    income_data['years'] = years[-5:]  # Last 5 years

                for row in table.find_all('tr'):
                    cells = row.find_all('td')
                    if not cells:
                        continue
                    label = cells[0].get_text(strip=True).lower()
                    values = [_parse_number(c.get_text(strip=True)) for c in cells[1:]]
                    values = values[-5:]  # Last 5 years

                    if 'sales' in label or 'revenue' in label:
                        income_data['revenue'] = values
                        # Set latest revenue
                        valid = [v for v in values if v is not None]
                        if valid:
                            data['revenue'] = valid[-1]
                    elif 'net profit' in label:
                        income_data['profit'] = values
                        valid = [v for v in values if v is not None]
                        if valid:
                            data['net_profit'] = valid[-1]
                    elif 'operating profit' in label or 'ebitda' in label:
                        income_data['ebitda'] = values

        data['income_statement'] = income_data

        # Balance Sheet
        bs_data = {"years": [], "assets": [], "liabilities": [], "equity": []}
        bs_section = soup.find('section', id='balance-sheet')
        if bs_section:
            table = bs_section.find('table')
            if table:
                headers_row = table.find('thead')
                if headers_row:
                    years = [th.get_text(strip=True) for th in headers_row.find_all('th')][1:]
                    bs_data['years'] = years[-5:]

                for row in table.find_all('tr'):
                    cells = row.find_all('td')
                    if not cells:
                        continue
                    label = cells[0].get_text(strip=True).lower()
                    values = [_parse_number(c.get_text(strip=True)) for c in cells[1:]]
                    values = values[-5:]

                    if 'total assets' in label:
                        bs_data['assets'] = values
                        valid = [v for v in values if v is not None]
                        if valid:
                            data['total_assets'] = valid[-1]
                    elif 'total liabilities' in label or 'borrowings' in label:
                        bs_data['liabilities'] = values
                        valid = [v for v in values if v is not None]
                        if valid:
                            data['total_liabilities'] = valid[-1]
                    elif 'equity' in label or "shareholders' funds" in label:
                        bs_data['equity'] = values
                        valid = [v for v in values if v is not None]
                        if valid:
                            data['equity'] = valid[-1]

        data['balance_sheet'] = bs_data

        # Quarterly results
        quarterly_data = {"quarters": [], "revenue": [], "profit": []}
        q_section = soup.find('section', id='quarters')
        if q_section:
            table = q_section.find('table')
            if table:
                headers_row = table.find('thead')
                if headers_row:
                    quarters = [th.get_text(strip=True) for th in headers_row.find_all('th')][1:]
                    quarterly_data['quarters'] = quarters[-8:]

                for row in table.find_all('tr'):
                    cells = row.find_all('td')
                    if not cells:
                        continue
                    label = cells[0].get_text(strip=True).lower()
                    values = [_parse_number(c.get_text(strip=True)) for c in cells[1:]]
                    values = values[-8:]
                    if 'sales' in label or 'revenue' in label:
                        quarterly_data['revenue'] = values
                    elif 'net profit' in label:
                        quarterly_data['profit'] = values

        data['quarterly_results'] = quarterly_data

        # BSE/NSE codes from page
        bse_nse = soup.find('div', class_='company-links') or soup.find('div', id='company-links')
        if bse_nse:
            links_text = bse_nse.get_text()
            if 'NSE' in links_text:
                data['exchange'] = 'NSE'
            elif 'BSE' in links_text:
                data['exchange'] = 'BSE'

        data['ticker'] = ticker.upper()
        data['is_listed'] = True
        data['data_source'] = 'screener'

        return data

    except ImportError:
        return {"error": "BeautifulSoup4 not installed. Run: pip install beautifulsoup4 requests"}
    except Exception as e:
        return {"error": f"Scraping failed: {str(e)}"}

def _generate_ai_analysis(company_data: dict) -> dict:
    """Generate AI-powered risk and growth analysis for a company."""
    try:
        import openai
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key or api_key.startswith("your_"):
            raise ValueError("No valid API key")

        client = openai.OpenAI(api_key=api_key)

        prompt = f"""Analyze this company for risk management and growth potential:

Company: {company_data.get('name', 'Unknown')}
Industry: {company_data.get('industry', 'Unknown')}
Market Cap: ₹{company_data.get('market_cap', 'N/A')} Cr
Revenue: ₹{company_data.get('revenue', 'N/A')} Cr
Net Profit: ₹{company_data.get('net_profit', 'N/A')} Cr
P/E Ratio: {company_data.get('pe_ratio', 'N/A')}
ROE: {company_data.get('roe', 'N/A')}%
ROCE: {company_data.get('roce', 'N/A')}%
Debt/Equity: {company_data.get('debt_to_equity', 'N/A')}
Known Strengths: {company_data.get('strengths', [])}
Known Weaknesses: {company_data.get('weaknesses', [])}

Provide a comprehensive risk and growth analysis. Return JSON with exactly this structure:
{{
  "executive_summary": "2-3 sentence overview",
  "risk_score": <1-10 float, 10=highest risk>,
  "growth_score": <1-10 float, 10=highest growth potential>,
  "strengths": ["strength1", "strength2", "strength3", "strength4"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
  "threats": ["threat1", "threat2", "threat3"],
  "key_risks": [
    {{"name": "Risk Name", "severity": "high|medium|low", "description": "brief desc", "mitigation": "action"}},
    ...3-4 risks
  ],
  "growth_drivers": ["driver1", "driver2", "driver3"],
  "recommendation": "buy|hold|avoid|monitor",
  "analyst_note": "One paragraph actionable advice"
}}"""

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception:
        # Mock analysis
        name = company_data.get('name', 'This Company')
        roe = company_data.get('roe') or 0
        de = company_data.get('debt_to_equity') or 0
        pe = company_data.get('pe_ratio') or 0

        risk_score = min(10, max(1, 5 + (de * 0.5) - (roe * 0.05)))
        growth_score = min(10, max(1, 5 + (roe * 0.1) - (de * 0.2)))

        return {
            "executive_summary": f"{name} operates in the {company_data.get('industry','selected')} sector. Based on financial metrics, the company shows {'strong' if roe > 15 else 'moderate'} profitability with {'manageable' if de < 1 else 'elevated'} debt levels.",
            "risk_score": round(risk_score, 1),
            "growth_score": round(growth_score, 1),
            "strengths": company_data.get('strengths') or ["Established market presence", "Diversified revenue streams", "Strong management team"],
            "weaknesses": company_data.get('weaknesses') or ["Margin pressure from competition", "Dependency on key customers", "High working capital requirements"],
            "opportunities": ["Market expansion into new geographies", "Digital transformation initiatives", "Potential M&A opportunities", "Rising domestic consumption"],
            "threats": ["Regulatory changes", "Increasing competition", "Macroeconomic headwinds", "Currency volatility"],
            "key_risks": [
                {"name": "Market Risk", "severity": "medium", "description": "Exposure to market volatility and cyclical downturns", "mitigation": "Diversify revenue across segments and geographies"},
                {"name": "Debt Risk", "severity": "high" if de > 1.5 else "low", "description": f"D/E ratio of {de} indicates {'elevated' if de > 1.5 else 'manageable'} leverage", "mitigation": "Focus on deleveraging and improving cash flows"},
                {"name": "Regulatory Risk", "severity": "medium", "description": "Changes in industry regulations could impact operations", "mitigation": "Maintain compliance team and engage with regulators proactively"},
            ],
            "growth_drivers": ["Increasing sector tailwinds", "Product/service innovation", "Geographic expansion", "Digital adoption"],
            "recommendation": "hold" if risk_score > 6 else "buy" if growth_score > 6 else "monitor",
            "analyst_note": f"Based on available financial data, {name} presents {'a cautious' if risk_score > 6 else 'an interesting'} investment case. {'High debt levels warrant monitoring.' if de > 1.5 else 'The balance sheet appears healthy.'} {'Strong ROE indicates efficient capital allocation.' if roe > 15 else 'ROE improvement would strengthen the investment case.'}"
        }

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/")
def list_companies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    companies = db.query(models.Company).filter(
        models.Company.organization_id == current_user.organization_id
    ).order_by(models.Company.created_at.desc()).all()
    return [_company_dict(c) for c in companies]

@router.post("/")
def create_company(
    req: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company = models.Company(
        organization_id=current_user.organization_id,
        name=req.name,
        ticker=req.ticker,
        exchange=req.exchange,
        is_listed=req.is_listed,
        industry=req.industry,
        sector=req.sector,
        website=req.website,
        description=req.description,
        market_cap=req.market_cap,
        current_price=req.current_price,
        revenue=req.revenue,
        net_profit=req.net_profit,
        total_assets=req.total_assets,
        total_liabilities=req.total_liabilities,
        equity=req.equity,
        pe_ratio=req.pe_ratio,
        pb_ratio=req.pb_ratio,
        roe=req.roe,
        roce=req.roce,
        debt_to_equity=req.debt_to_equity,
        current_ratio=req.current_ratio,
        dividend_yield=req.dividend_yield,
        eps=req.eps,
        data_source="manual",
        strengths=json.dumps([]),
        weaknesses=json.dumps([]),
        opportunities=json.dumps([]),
        threats=json.dumps([]),
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return _company_dict(company)

@router.get("/fetch/{ticker}")
def fetch_company(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch company data from Screener.in"""
    data = fetch_screener_data(ticker)

    if "error" in data:
        raise HTTPException(status_code=422, detail=data["error"])

    return {"fetched": True, "data": data, "source": "screener.in"}

@router.post("/fetch-and-save/{ticker}")
def fetch_and_save_company(
    ticker: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fetch from Screener.in and save to DB, then run AI analysis."""
    data = fetch_screener_data(ticker)

    if "error" in data:
        raise HTTPException(status_code=422, detail=data["error"])

    # Run AI analysis
    analysis = _generate_ai_analysis(data)

    # Merge AI results into data
    if not data.get('strengths') or len(data.get('strengths', [])) == 0:
        data['strengths'] = analysis.get('strengths', [])
    if not data.get('weaknesses') or len(data.get('weaknesses', [])) == 0:
        data['weaknesses'] = analysis.get('weaknesses', [])

    # Check if already exists
    existing = db.query(models.Company).filter(
        models.Company.ticker == ticker.upper(),
        models.Company.organization_id == current_user.organization_id,
    ).first()

    def safe_json(val):
        if isinstance(val, list):
            return json.dumps(val)
        if isinstance(val, dict):
            return json.dumps(val)
        return json.dumps([])

    if existing:
        company = existing
    else:
        company = models.Company(organization_id=current_user.organization_id)
        db.add(company)

    company.name = data.get('name', ticker.upper())
    company.ticker = ticker.upper()
    company.exchange = data.get('exchange', 'NSE')
    company.is_listed = True
    company.industry = data.get('industry')
    company.sector = data.get('sector')
    company.description = data.get('description')
    company.market_cap = data.get('market_cap')
    company.current_price = data.get('current_price')
    company.revenue = data.get('revenue')
    company.net_profit = data.get('net_profit')
    company.total_assets = data.get('total_assets')
    company.total_liabilities = data.get('total_liabilities')
    company.equity = data.get('equity')
    company.pe_ratio = data.get('pe_ratio')
    company.pb_ratio = data.get('pb_ratio')
    company.roe = data.get('roe')
    company.roce = data.get('roce')
    company.debt_to_equity = data.get('debt_to_equity')
    company.dividend_yield = data.get('dividend_yield')
    company.eps = data.get('eps')
    company.face_value = data.get('face_value')
    company.balance_sheet = safe_json(data.get('balance_sheet', {}))
    company.income_statement = safe_json(data.get('income_statement', {}))
    company.quarterly_results = safe_json(data.get('quarterly_results', {}))
    company.strengths = safe_json(data.get('strengths', []))
    company.weaknesses = safe_json(data.get('weaknesses', []))
    company.opportunities = safe_json(analysis.get('opportunities', []))
    company.threats = safe_json(analysis.get('threats', []))
    company.ai_analysis = json.dumps(analysis)
    company.risk_score = analysis.get('risk_score')
    company.growth_score = analysis.get('growth_score')
    company.data_source = 'screener'
    company.last_fetched_at = datetime.utcnow()

    db.commit()
    db.refresh(company)
    return _company_dict(company)

@router.get("/{company_id}")
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.organization_id == current_user.organization_id,
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return _company_dict(company)

@router.put("/{company_id}")
def update_company(
    company_id: int,
    req: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.organization_id == current_user.organization_id,
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    for field, value in req.dict(exclude_none=True).items():
        if field in ('balance_sheet', 'income_statement') and isinstance(value, dict):
            setattr(company, field, json.dumps(value))
        else:
            setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return _company_dict(company)

@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.organization_id == current_user.organization_id,
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
    return {"success": True}

@router.post("/{company_id}/analyze")
def analyze_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Re-run AI analysis on a company."""
    company = db.query(models.Company).filter(
        models.Company.id == company_id,
        models.Company.organization_id == current_user.organization_id,
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company_data = _company_dict(company)
    analysis = _generate_ai_analysis(company_data)

    company.ai_analysis = json.dumps(analysis)
    company.risk_score = analysis.get('risk_score')
    company.growth_score = analysis.get('growth_score')
    if analysis.get('opportunities'):
        company.opportunities = json.dumps(analysis['opportunities'])
    if analysis.get('threats'):
        company.threats = json.dumps(analysis['threats'])

    db.commit()
    return {"success": True, "analysis": analysis}
