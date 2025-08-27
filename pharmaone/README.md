# PharmaOne — Iraq-first Pharma Webapp (MVP)

A bilingual (Arabic/English) one-stop web app for reporting, accounting ROI matching, and data tools for Iraq's pharma market. This MVP is static, fast to demo, and uses mock/public data.

## Tech
- Pure static SPA (no backend): HTML + CSS + JS
- Chart.js, PapaParse, jsPDF, pdf.js
- LocalStorage for activity log and settings

## Run Locally
1. Start a static server in this folder:
   - Python: `python3 -m http.server 8080` or
   - Node (npx): `npx serve -l 8080` or
   - Busybox: `busybox httpd -f -p 8080`
2. Open `http://localhost:8080` in your browser.

## Pages
- Dashboard: KPI tiles, recent activity, sample data button
- Reporting: Upload CSV or load sample, KPIs, charts, export to PDF/CSV
- Accounting: Upload invoices+campaigns or sample, auto-matching with confidence badges and "why"
- Tenders: Upload PDF/paste text → extract tender #, deadline, requirements, summary
- Regulation & Promo: Ask compliance questions and check promo claims against SPCs — always shows citations or returns "I don't know" with suggested sources
- Insights: Mocked public widgets (WHO/UN/etc.)
- Roadmap: Partner data features labeled Coming Soon with data requirements

## Sample Data
- `data/sales_sample.csv`
- `data/invoices_sample.csv`
- `data/campaigns_sample.csv`
- `data/tender_sample.txt`
- `data/regulation_sources.json`
- `data/spc_sources.json`
- `data/insights_public.json`

## Demo Script (2 minutes)
1. Regulation: Ask "biosimilars import?" → shows citations (MOH circular) or unknown
2. Tenders: Load sample tender text → shows tender number, deadline, requirements, summary
3. Reporting: Load sample sales → KPIs update, region chart renders → export PDF/CSV
4. Accounting: Load sample invoices+campaigns → matches appear with High/Med/Low badges and "why"
5. Roadmap: Show Coming Soon cards and explain partner data unlocks

## Assumptions & Open Questions
- Which systems are common in Iraq pharmacies for POS/ERP? CSV formats?
- Typical Kimadia tender number patterns and standard sections to parse?
- Which public SPC repositories are preferred locally? (Arabic sources?)
- Marketing ROI definitions locally: attribution window and matching rules?
- Pricing sensitivity: should we mask certain values by role (owner vs staff)?
- Authentication: acceptable providers (Firebase, local, SSO)?
- Languages: any Kurdish (Sorani) requirement alongside AR/EN?

## Notes
- This is an MVP. All AI-like answers are deterministic keyword searches across local JSONs to avoid hallucinations. If no match, we return "I don't know" and suggest sources.
- Replace local JSONs with real APIs later; keep the UI and contracts.