import os
import json
from typing import Dict, Any, Optional

import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from dotenv import load_dotenv
from io import BytesIO
from PyPDF2 import PdfReader
import re
from fastapi import UploadFile, File

# ======================
#  Config / env
# ======================
load_dotenv()

SALTEDGE_APP_ID = os.getenv("SALTEDGE_APP_ID")
SALTEDGE_SECRET = os.getenv("SALTEDGE_SECRET")
PORT = int(os.getenv("PORT", "3000"))

BASE_URL = "https://www.saltedge.com/api/v6"

if not SALTEDGE_APP_ID or not SALTEDGE_SECRET:
    print("⚠️  Manca SALTEDGE_APP_ID o SALTEDGE_SECRET nel .env")

COMMON_HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "App-id": SALTEDGE_APP_ID,
    "Secret": SALTEDGE_SECRET,
}

# Stato in memoria
STATE: Dict[str, Any] = {
    "customer_id": None,
}


# ======================
#  Helpers Salt Edge
# ======================

def se_post(path: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = BASE_URL + path
    payload = {"data": data or {}}
    print(f"SE POST {url} payload={payload}")
    resp = requests.post(
        url,
        headers=COMMON_HEADERS,
        data=json.dumps(payload),
        timeout=30,
    )
    print("SE STATUS:", resp.status_code)
    print("SE BODY:", resp.text[:500])
    resp.raise_for_status()
    return resp.json()


def se_get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = BASE_URL + path
    print(f"SE GET {url} params={params}")
    resp = requests.get(
        url,
        headers=COMMON_HEADERS,
        params=params or {},
        timeout=30,
    )
    print("SE STATUS:", resp.status_code)
    print("SE BODY:", resp.text[:500])
    resp.raise_for_status()
    return resp.json()


# ======================
# FastAPI
# ======================

app = FastAPI(title="Aurya – Salt Edge MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ======================
#  Helpers Trade Republic (PDF)
# ======================

def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages)


def parse_tr_cash_statement(pdf_bytes: bytes) -> float:
    """
    Estrae il saldo finale del conto corrente Trade Republic
    dall'estratto conto cassa (PDF).

    Nel tuo file vediamo una tabella tipo:
    'Conto corrente 2.646,02 € 4.528,82 € 2.458,21 € 4.716,63 €'
    dove l'ultima cifra è il SALDO FINALE. 
    """
    text = extract_text_from_pdf(pdf_bytes)

    # Cerco la riga che contiene "Conto corrente"
    lines = text.splitlines()
    for line in lines:
        if "Conto corrente" in line:
            # prendo tutti i numeri in formato europeo tipo 4.716,63
            amounts = re.findall(r"(\d{1,3}(?:\.\d{3})*,\d{2})", line)
            if amounts:
                saldo_finale_str = amounts[-1]  # l'ultimo è il saldo finale
                saldo_finale_str = saldo_finale_str.replace(".", "").replace(",", ".")
                return float(saldo_finale_str)

    # fallback: se non trovo la riga, provo dalla "PANORAMICA DEL SALDO"
    # es: 'Citibank 4.716,63 €' 
    for line in lines:
        if "Citibank" in line:
            amounts = re.findall(r"(\d{1,3}(?:\.\d{3})*,\d{2})", line)
            if amounts:
                saldo_str = amounts[-1].replace(".", "").replace(",", ".")
                return float(saldo_str)

    raise ValueError("Impossibile leggere il saldo dal PDF cash account.")


def parse_tr_securities_statement(pdf_bytes: bytes) -> float:

    """
    Estrae il valore totale del portafoglio titoli dall'estratto conto titoli.

    Nel tuo file c'è una riga:
    'NUMERO DI POSIZIONI: 15 62.348,68 EUR'
    dove l'ultima cifra è il valore di mercato complessivo. 
    """
    text = extract_text_from_pdf(pdf_bytes)
    lines = text.splitlines()

    for line in lines:
        if "NUMERO DI POSIZIONI" in line:
            # prendo l'ultimo numero in formato europeo
            amounts = re.findall(r"(\d{1,3}(?:\.\d{3})*,\d{2})", line)
            if amounts:
                total_str = amounts[-1].replace(".", "").replace(",", ".")
                return float(total_str)

    raise ValueError("Impossibile leggere il valore totale titoli dal PDF securities.")


def parse_tr_securities_statement_with_positions(pdf_bytes: bytes):
    """
    Parser robusto per portafogli Trade Republic.
    Gestisce posizioni su più righe:
    - Nome su 1-2 righe
    - ISIN su riga separata
    - Quantità in una riga dedicata
    """
    text = extract_text_from_pdf(pdf_bytes)
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # 1️⃣ Trova il totale titoli
    total_value = 0.0
    total_regex = re.compile(r"(\d{1,3}(?:\.\d{3})*,\d{2})\s*EUR")
    for line in lines:
        if "NUMERO DI POSIZIONI" in line:
            m = total_regex.search(line)
            if m:
                total_value = float(m.group(1).replace(".", "").replace(",", "."))
                break

    # 2️⃣ Ricostruzione posizioni
    positions = []
    current = {"name": "", "isin": None, "qty": None}

    for line in lines:
        if "IVA" in line or "P. IVA" in line:
          continue
        # ISIN?
        isin_match = re.search(r"\b([A-Z]{2}[A-Z0-9]{9}\d)\b", line)
        if isin_match:
            # se c'era una posizione in costruzione → salvala
            if current["isin"]:
                positions.append({
                    "name": current["name"].strip(),
                    "isin": current["isin"],
                    "quantity": current["qty"] or 0.0,
                    "market_value": 0.0
                })
                current = {"name": "", "isin": None, "qty": None}

            current["isin"] = isin_match.group(0)
            continue

        # Quantità (numeri tipo 2202.87 o 14)
        qty_match = re.search(r"(\d+(?:[\.,]\d+)?)$", line)
        if qty_match and current["isin"]:
            q = qty_match.group(1).replace(",", ".")
            try:
                current["qty"] = float(q)
                continue
            except:
                pass

        # Nome titolo (qualsiasi riga non ISIN e non quantità)
        if current["isin"]:
            current["name"] += " " + line

    # aggiungi l’ultima posizione
    if current["isin"]:
        positions.append({
            "name": current["name"].strip(),
            "isin": current["isin"],
            "quantity": current["qty"] or 0.0,
            "market_value": 0.0
        })

    return total_value, positions

@app.post("/api/brokers/traderepublic")
async def upload_traderepublic(
    cash_statement: UploadFile = File(...),
    securities_statement: UploadFile = File(...)
):
    try:
        cash_bytes = await cash_statement.read()
        sec_bytes = await securities_statement.read()

        cash_eur = parse_tr_cash_statement(cash_bytes)
        securities_eur, positions = parse_tr_securities_statement_with_positions(sec_bytes)

        total_tr = cash_eur + securities_eur

        # 🔵 Salviamo tutto in memoria
        STATE["trade_republic"] = {
            "cash_eur": cash_eur,
            "securities_eur": securities_eur,
            "total_eur": total_tr,
            "positions": positions
        }

        return HTMLResponse(
            f"""
            <h2>Importazione Trade Republic completata!</h2>
            <p>Cash: {cash_eur} EUR</p>
            <p>Titoli: {securities_eur} EUR</p>
            <p><a href='/dashboard'>Vai alla dashboard</a></p>
            """
        )

    except Exception as e:
        return HTMLResponse(f"<pre>{e}</pre>", status_code=500)



@app.get("/import_broker")
def import_broker_page():
    html = """
    <h2>Importa Broker (Trade Republic)</h2>
    <form action="/api/brokers/traderepublic" method="post" enctype="multipart/form-data">
      <p>Seleziona PDF cash account:</p>
      <input type="file" name="cash_statement" required />
      <br><br>
      <p>Seleziona PDF securities account:</p>
      <input type="file" name="securities_statement" required />
      <br><br>
      <button type="submit">Importa</button>
    </form>
    <p><a href="/">← Torna alla home</a></p>
    """
    return HTMLResponse(html)



# ======================
#  HOME (stile sito Aurya)
# ======================

@app.get("/")
def index():
    customer = STATE.get("customer_id") or "nessuno"

    html = f"""
    <!doctype html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <title>Aurya – Net Worth unito e ottimizzato</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        :root {{
          --bg: #020617;
          --bg-elevated: #02081f;
          --card: #020617;
          --card-soft: #020617;
          --accent: #4f46e5;
          --accent-soft: rgba(79,70,229,0.25);
          --accent-2: #22d3ee;
          --border-subtle: rgba(148,163,184,0.25);
          --text-main: #e5e7eb;
          --text-muted: #9ca3af;
          --radius-xl: 24px;
          --radius-lg: 18px;
          --shadow-soft: 0 18px 45px rgba(15,23,42,0.75);
        }}

        * {{
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }}

        body {{
          min-height: 100vh;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
                       "Helvetica Neue", Arial, sans-serif;
          color: var(--text-main);
          background:
            radial-gradient(circle at top left, rgba(56,189,248,0.15), transparent 55%),
            radial-gradient(circle at top right, rgba(129,140,248,0.18), transparent 60%),
            radial-gradient(circle at bottom, rgba(30,64,175,0.55), #020617 70%);
          background-attachment: fixed;
        }}

        .shell {{
          max-width: 1120px;
          margin: 0 auto;
          padding: 28px 20px 64px;
        }}

        /* NAVBAR */

        .nav {{
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }}

        .nav-left {{
          display: flex;
          align-items: center;
          gap: 14px;
        }}

        .logo-pill {{
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: radial-gradient(circle at 20% 0%, #22d3ee, transparent 55%),
                      radial-gradient(circle at 80% 100%, #4f46e5, transparent 60%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 1px rgba(148,163,184,0.18), 0 12px 32px rgba(15,23,42,0.8);
        }}

        .logo-pill span {{
          font-size: 18px;
        }}

        .nav-title {{
          font-weight: 600;
          letter-spacing: 0.02em;
        }}

        .nav-badge {{
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(148,163,184,0.35);
          color: var(--text-muted);
        }}

        .nav-links {{
          display: flex;
          gap: 16px;
          align-items: center;
          font-size: 13px;
        }}

        .nav-link {{
          color: var(--text-muted);
          text-decoration: none;
          padding: 4px 0;
        }}

        .nav-link:hover {{
          color: #e5e7eb;
        }}

        .nav-cta {{
          padding: 6px 16px;
          border-radius: 999px;
          border: none;
          background: radial-gradient(circle at 0% 0%, #22d3ee, #4f46e5);
          color: white;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 10px 35px rgba(56,189,248,0.45);
          cursor: pointer;
        }}

        /* HERO */

        .hero {{
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
          gap: 40px;
          align-items: center;
        }}

        .eyebrow {{
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          padding: 4px 11px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.45);
          background: rgba(15,23,42,0.85);
          color: var(--text-muted);
          margin-bottom: 16px;
        }}

        .eyebrow-dot {{
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 0 5px rgba(34,197,94,0.25);
        }}

        .hero-title {{
          font-size: clamp(34px, 4vw, 40px);
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin-bottom: 16px;
        }}

        .hero-title strong {{
          background: linear-gradient(120deg, #22d3ee, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }}

        .hero-sub {{
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 520px;
          margin-bottom: 22px;
        }}

        .hero-actions {{
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }}

        .btn-primary {{
          padding: 10px 20px;
          border-radius: 999px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          color: white;
          background: radial-gradient(circle at 0% 0%, #22d3ee, #4f46e5);
          box-shadow: 0 14px 40px rgba(56,189,248,0.55);
        }}

        .btn-ghost {{
          padding: 9px 18px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.6);
          background: rgba(15,23,42,0.8);
          color: var(--text-main);
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }}

        .hero-footnote {{
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 8px;
        }}

        .hero-list {{
          margin-top: 18px;
          font-size: 13px;
          color: var(--text-muted);
          display: grid;
          gap: 4px;
        }}

        .hero-list span {{
          display: flex;
          align-items: center;
          gap: 8px;
        }}

        .hero-list span i {{
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: rgba(34,197,94,0.12);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #4ade80;
        }}

        /* RIGHT CARD */

        .hero-right {{
          display: flex;
          justify-content: center;
        }}

        .metric-card {{
          width: 100%;
          max-width: 420px;
          border-radius: var(--radius-xl);
          padding: 18px 18px 18px;
          background: radial-gradient(circle at top left, rgba(56,189,248,0.25), transparent 55%),
                      radial-gradient(circle at bottom right, rgba(129,140,248,0.4), transparent 60%),
                      rgba(15,23,42,0.95);
          border: 1px solid rgba(148,163,184,0.25);
          box-shadow: var(--shadow-soft);
        }}

        .metric-header {{
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 13px;
        }}

        .metric-header span {{
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }}

        .metric-dot {{
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: radial-gradient(circle at 20% 0%, #22d3ee, #4f46e5);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }}

        .metric-badge {{
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.45);
          background: rgba(15,23,42,0.85);
          color: var(--text-muted);
        }}

        .metric-value {{
          font-size: 26px;
          font-weight: 600;
          margin-bottom: 8px;
        }}

        .metric-caption {{
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 14px;
        }}

        .progress-track {{
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(30,64,175,0.6);
          overflow: hidden;
          margin-bottom: 8px;
        }}

        .progress-bar {{
          height: 100%;
          width: 78%;
          background: linear-gradient(90deg, #22d3ee, #4f46e5);
          box-shadow: 0 0 12px rgba(56,189,248,0.8);
        }}

        .progress-foot {{
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }}

        .metric-grid {{
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 10px;
        }}

        .pill-card {{
          border-radius: var(--radius-lg);
          padding: 10px 11px;
          background: rgba(15,23,42,0.92);
          border: 1px solid rgba(148,163,184,0.25);
          font-size: 11px;
        }}

        .pill-title {{
          font-size: 11px;
          font-weight: 500;
          margin-bottom: 4px;
        }}

        .pill-body {{
          font-size: 11px;
          color: var(--text-muted);
        }}

        .customer-status {{
          margin-top: 18px;
          font-size: 11px;
          color: var(--text-muted);
        }}

        .customer-status code {{
          font-size: 11px;
          padding: 3px 7px;
          border-radius: 999px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(148,163,184,0.35);
        }}

        @media (max-width: 860px) {{
          .hero {{
            grid-template-columns: minmax(0,1fr);
            gap: 28px;
          }}
          .hero-right {{
            order: -1;
          }}
        }}
      </style>
    </head>
    <body>
      <div class="shell">
        <header class="nav">
          <div class="nav-left">
            <div class="logo-pill">
              <span>₳</span>
            </div>
            <div>
              <div class="nav-title">Aurya</div>
              <div style="font-size:11px; color:var(--text-muted);">Private Beta • Sandbox</div>
            </div>
          </div>
          <div class="nav-links">
            <a class="nav-link" href="#prodotto">Prodotto</a>
            <a class="nav-link" href="/dashboard">Dashboard</a>
            <span class="nav-badge">Sandbox Salt&nbsp;Edge</span>
            <button class="nav-cta" onclick="location.href='/connect_bank'">
              Collega una banca fake
            </button>
          </div>
        </header>

        <main class="hero" id="prodotto">
          <section>
            <div class="eyebrow">
              <span class="eyebrow-dot"></span>
              <span>Nuovo · Private Beta</span>
            </div>

            <h1 class="hero-title">
              Il tuo <strong>Net Worth</strong>,<br/>
              unito e <strong>ottimizzato</strong>.
            </h1>

            <p class="hero-sub">
              Aurya aggrega i tuoi conti e investimenti, stima il valore dei beni fisici
              e usa modelli quantitativi per suggerirti come riequilibrare in modo
              coerente al tuo profilo di rischio.
            </p>

           <div class="hero-actions">
              <button class="btn-primary" onclick="location.href='/connect'">
                Crea customer
              </button>

              <button class="btn-ghost" onclick="location.href='/connect_bank'">
                <span>Collega banca fake</span>
                <span style="font-size:12px;">↗</span>
              </button>

              <button class="btn-ghost" onclick="location.href='/dashboard'">
                Apri dashboard sandbox
              </button>

              <button class="btn-ghost" onclick="location.href='/import_broker'">
                Importa broker (PDF/CSV)
              </button>
            </div>

            <p class="hero-footnote">
              Customer corrente:
              <code style="padding:3px 7px;border-radius:999px;border:1px solid rgba(148,163,184,0.35);background:rgba(15,23,42,0.9);">
                {customer}
              </code>
              · se è <em>nessuno</em>, crea un customer e collega una banca fake.
            </p>

            <div class="hero-list">
              <span><i>✓</i> Aggregazione multi-conto &amp; stima beni fisici</span>
              <span><i>✓</i> Sandbox integrata con Salt Edge (solo dati fake)</span>
              <span><i>✓</i> Zero credenziali reali, solo simulazione sicura</span>
            </div>
          </section>

          <aside class="hero-right">
            <div class="metric-card">
              <div class="metric-header">
                <span>
                  <span class="metric-dot">₳</span>
                  <span>Net Worth stimato</span>
                </span>
                <span class="metric-badge">Sandbox · Read-only</span>
              </div>

              <div class="metric-value" id="hero-total">— EUR</div>
              <div class="metric-caption">Net worth bancario raccolto via Salt Edge (fake data).</div>

              <div class="progress-track">
                <div class="progress-bar" id="hero-progress"></div>
              </div>
              <div class="progress-foot">
                <span>Copertura asset</span>
                <span id="hero-coverage">0%</span>
              </div>

              <div class="metric-grid">
                <div class="pill-card">
                  <div class="pill-title">Conti &amp; Broker</div>
                  <div class="pill-body">
                    Collega banche e broker di prova in pochi clic.
                  </div>
                </div>
                <div class="pill-card">
                  <div class="pill-title">Beni fisici</div>
                  <div class="pill-body">
                    In futuro: tech, auto, libri e altro con stime assistite.
                  </div>
                </div>
                <div class="pill-card">
                  <div class="pill-title">Ottimizzazione</div>
                  <div class="pill-body">
                    Simulazioni di portafoglio target e ribilanciamento.
                  </div>
                </div>
              </div>

              <div class="customer-status">
                Stato corrente: <code id="hero-status">In attesa dati…</code>
              </div>
            </div>
          </aside>
        </main>
      </div>

      <script>
        // Aggiorna card destra con i dati reali dell'API /api/networth
        fetch('/api/networth')
          .then(r => r.json())
          .then(data => {{
            if (data.error) {{
              document.getElementById('hero-total').textContent = '— EUR';
              document.getElementById('hero-status').textContent = data.error;
              document.getElementById('hero-coverage').textContent = '0%';
              return;
            }}

            const total = data.total_balance || 0;
            const formatter = new Intl.NumberFormat('it-IT', {{
              style: 'currency',
              currency: 'EUR'
            }});

            document.getElementById('hero-total').textContent = formatter.format(total);

            // Copertura finta: clamp rispetto a 50k per non fare 1000%
            const coverage = Math.max(0, Math.min(100, Math.round((total / 50000) * 100)));
            document.getElementById('hero-coverage').textContent = coverage + '%';
            document.getElementById('hero-progress').style.width = Math.max(6, coverage) + '%';

            const accountsCount = (data.accounts || []).length;
            const status = accountsCount > 0
              ? `Customer con ${{accountsCount}} conto/i collegati`
              : 'Customer senza conti collegati';
            document.getElementById('hero-status').textContent = status;
          }})
          .catch(err => {{
            document.getElementById('hero-status').textContent = 'Errore nel caricamento dati';
          }});
      </script>
    </body>
    </html>
    """
    return HTMLResponse(html)



    


# ======================
# Crea customer
# ======================

@app.get("/connect")
def connect_fake():
    try:
        identifier = "aurya_fake_user_1"

        try:
            resp = se_post("/customers", {"identifier": identifier})
            customer_id = resp["data"]["customer_id"]

        except requests.HTTPError as e:
            if e.response.status_code == 409:
                existing = se_get("/customers", {"identifier": identifier})
                customer_id = existing["data"][0]["customer_id"]
            else:
                raise

        STATE["customer_id"] = customer_id

        return HTMLResponse(
            f"<h2>Customer OK</h2><p>ID: {customer_id}</p><a href='/'>Torna alla home</a>"
        )

    except Exception as e:
        return HTMLResponse(f"<pre>{e}</pre>", status_code=500)


# ======================
# CREA SESSIONE WIDGET
# ======================

@app.get("/connect_bank")
def connect_bank():
    try:
        customer_id = STATE.get("customer_id")
        if not customer_id:
            raise RuntimeError("Customer non creato")

        body = {
            "customer_id": customer_id,
            "consent": {
                "scopes": ["accounts", "transactions"],
                "period_days": 90
            },
            "attempt": {
                "fetch_scopes": ["accounts", "balance", "transactions"],
                "locale": "it",
                "store_credentials": True,
                "return_to": "http://localhost:3000/callback"
            },
            "widget": {
                "allowed_countries": ["XF"],
                "popular_providers_country": "XF",
                "template": "default_v3",
                "theme": "default",
                "skip_provider_selection": False
            },
            "provider": {
                "include_sandboxes": True
            },
            "return_connection_id": True,
            "return_error_class": True,
        }

        resp = se_post("/connections/connect", body)
        url = resp["data"]["connect_url"]

        return HTMLResponse(f"<script>window.location='{url}'</script>")

    except Exception as e:
        return HTMLResponse(f"<pre>{e}</pre>", status_code=500)


# ======================
# CALLBACK
# ======================

@app.get("/callback")
def callback(connection_id: str = None, error_class: str = None):
    """
    - Prende connection_id dal widget
    - Se manca lo recupera
    - Avvia automaticamente la sincronizzazione
    """
    try:
        customer_id = STATE.get("customer_id")
        final_connection_id = connection_id
        attempt_id = None

        msg = "Salt Edge ha completato il collegamento."

        if error_class:
            msg = f"Errore: {error_class}"

        if not final_connection_id and customer_id:
            try:
                conns = se_get("/connections", {"customer_id": customer_id})
                if conns["data"]:
                    final_connection_id = conns["data"][0]["id"]
            except:
                pass

        if final_connection_id and customer_id:
            try:
                attempt = se_post(
                    f"/connections/{final_connection_id}/attempt",
                    {"fetch_scopes": ["accounts", "transactions"], "locale": "it"}
                )
                attempt_id = attempt["data"]["id"]
                msg += "<br>Sincronizzazione avviata."
            except:
                msg += "<br>Impossibile sincronizzare."

        html = f"""
        <h2>Connessione completata 🎉</h2>
        <p>{msg}</p>
        <p><b>connection_id:</b> {final_connection_id}</p>
        <p><b>attempt_id:</b> {attempt_id}</p>
        <a href="/dashboard">Vai alla dashboard</a>
        """
        return HTMLResponse(html)

    except Exception as e:
        return HTMLResponse(f"<pre>{e}</pre>", status_code=500)


# ======================
# API NET WORTH
# ======================

@app.get("/api/networth")
def api_networth():
    try:
        customer_id = STATE.get("customer_id")
        if not customer_id:
            return JSONResponse({"error": "Customer non creato"}, status_code=400)

        # ---- ACCOUNTS ----
        try:
            accounts_resp = se_get("/accounts", {"customer_id": customer_id})
            accounts = accounts_resp.get("data", [])
        except Exception as e:
            return JSONResponse({"error": f"Errore accounts: {e}"}, status_code=500)

        results = []
        total = 0.0

        for acc in accounts:
            account_id = acc["id"]
            balance = float(acc.get("balance") or 0)
            total += balance

            # ---- TRANSAZIONI ----
            txs = []
            try:
                connection_id = acc.get("connection_id")   # PRENDIAMO connection_id DALL'ACCOUNT
                tx_resp = se_get(
                    "/transactions",
                    {
                        "account_id": account_id,
                        "customer_id": customer_id,
                        "connection_id": connection_id
                    }
                )
                txs = tx_resp.get("data", [])
            except Exception as e:
                print("Errore transazioni:", e)
                txs = []

            results.append({
                "provider": acc.get("extra", {}).get("bank_name", "Fake Bank"),
                "name": acc.get("name"),
                "type": acc.get("nature"),
                "currency": acc.get("currency_code"),
                "balance": balance,
                "transactions": [
                    {
                        "date": t.get("made_on"),
                        "amount": t.get("amount"),
                        "currency": t.get("currency_code"),
                        "description": t.get("description", "")
                    }
                    for t in txs
                ]
            })

        tr = STATE.get("trade_republic")

        if tr: 
            total += tr["total_eur"]     

        return JSONResponse({
            "customer_id": customer_id,
            "total_balance": total,
            "accounts": results,
            "trade_republic": tr
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ======================
# DASHBOARD HTML (stile sito)
# ======================

@app.get("/dashboard")
def dashboard():
    html = """
    <!doctype html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <title>Aurya – Dashboard sandbox</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        :root {
          --bg: #020617;
          --panel: rgba(15,23,42,0.96);
          --panel-soft: rgba(15,23,42,0.9);
          --border-subtle: rgba(148,163,184,0.28);
          --accent: #4f46e5;
          --accent-2: #22d3ee;
          --text-main: #e5e7eb;
          --text-muted: #9ca3af;
          --radius-xl: 24px;
          --radius-lg: 18px;
          --shadow-soft: 0 20px 50px rgba(15,23,42,0.85);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          min-height: 100vh;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
                       "Helvetica Neue", Arial, sans-serif;
          color: var(--text-main);
          background:
            radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 60%),
            radial-gradient(circle at top right, rgba(129,140,248,0.22), transparent 65%),
            radial-gradient(circle at bottom, rgba(15,23,42,0.95), #020617 70%);
          background-attachment: fixed;
        }

        .shell {
          max-width: 1120px;
          margin: 0 auto;
          padding: 26px 18px 52px;
        }

        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }

        .nav-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-pill {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: radial-gradient(circle at 20% 0%, #22d3ee, #4f46e5);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 26px rgba(15,23,42,0.9);
        }

        .logo-pill span { font-size: 17px; }

        .nav-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .nav-btn {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.45);
          background: rgba(15,23,42,0.9);
          color: var(--text-main);
          font-size: 12px;
          cursor: pointer;
        }

        .nav-btn-primary {
          padding: 7px 16px;
          border-radius: 999px;
          border: none;
          background: radial-gradient(circle at 0% 0%, #22d3ee, #4f46e5);
          color: white;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 12px 36px rgba(56,189,248,0.55);
          cursor: pointer;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
          gap: 22px;
        }

        @media (max-width: 900px) {
          .layout {
            grid-template-columns: minmax(0,1fr);
          }
        }

        .card {
          border-radius: var(--radius-xl);
          background: var(--panel);
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-soft);
          padding: 18px 18px 18px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .card-title {
          font-size: 16px;
          font-weight: 500;
        }

        .pill {
          font-size: 11px;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.5);
          background: rgba(15,23,42,0.9);
          color: var(--text-muted);
        }

        .big-value {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .muted {
          font-size: 12px;
          color: var(--text-muted);
        }

        .progress-track {
          width: 100%;
          height: 7px;
          border-radius: 999px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(30,64,175,0.7);
          overflow: hidden;
          margin: 12px 0 6px;
        }

        .progress-bar {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #22d3ee, #4f46e5);
          box-shadow: 0 0 14px rgba(56,189,248,0.9);
          transition: width 0.4s ease-out;
        }

        .progress-foot {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 10px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }

        .chip {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(148,163,184,0.4);
          color: var(--text-muted);
        }

        .accounts-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px;
          margin-top: 8px;
        }

        @media (max-width: 680px) {
          .accounts-grid {
            grid-template-columns: minmax(0,1fr);
          }
        }

        .account-card {
          border-radius: var(--radius-lg);
          padding: 10px 11px;
          background: var(--panel-soft);
          border: 1px solid rgba(148,163,184,0.23);
          font-size: 12px;
        }

        .account-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .account-name {
          font-weight: 500;
          font-size: 13px;
        }

        .account-provider {
          font-size: 11px;
          color: var(--text-muted);
        }

        .account-balance {
          font-size: 15px;
          font-weight: 500;
        }

        .badge {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.5);
          color: var(--text-muted);
        }

        .table {
          margin-top: 12px;
          border-radius: var(--radius-lg);
          border: 1px solid rgba(148,163,184,0.4);
          overflow: hidden;
          background: var(--panel-soft);
        }

        .table-header, .table-row {
          display: grid;
          grid-template-columns: 90px minmax(0,1.4fr) 80px 80px;
          gap: 8px;
          font-size: 11px;
          padding: 7px 10px;
        }

        .table-header {
          background: rgba(15,23,42,0.98);
          color: var(--text-muted);
          border-bottom: 1px solid rgba(148,163,184,0.35);
        }

        .table-row:nth-child(odd) {
          background: rgba(15,23,42,0.96);
        }

        .table-row:nth-child(even) {
          background: rgba(15,23,42,0.9);
        }

        .table-row span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        
        /* ==========================
        TRADE REPUBLIC POSITIONS TABLE
        ========================== */
        .tr-table {
          margin-top: 8px;
          border: 1px solid rgba(148,163,184,0.25);
          border-radius: 12px;
          background: rgba(15,23,42,0.95);
          padding: 8px;
        }

        .tr-table-header {
          display: grid;
          grid-template-columns: 110px 1fr 60px 90px; /* ISIN | Nome | Qtà | Valore */
          padding: 6px 8px;
          color: #9ca3af;
          border-bottom: 1px solid rgba(148,163,184,0.25);
          font-size: 12px;
        }

        .tr-table-row {
          display: grid;
          grid-template-columns: 110px 1fr 60px 90px;
          padding: 6px 8px;
          font-size: 12px;
          border-bottom: 1px solid rgba(148,163,184,0.12);
        }

        .tr-table-row:last-child {
          border-bottom: none;
        }

        /* celle: testo su una riga con "..." se troppo lungo */
        .tr-table-header span,
        .tr-table-row span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }


        .pill-small {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.4);
          color: var(--text-muted);
        }

        .error-box {
          margin-top: 10px;
          padding: 10px 11px;
          border-radius: 12px;
          border: 1px solid rgba(248,113,113,0.7);
          background: rgba(127,29,29,0.45);
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="shell">
        <header class="nav">
          <div class="nav-group">
            <div class="logo-pill"><span>₳</span></div>
            <div>
              <div style="font-size:13px;font-weight:500;">Aurya · Dashboard sandbox</div>
              <div class="nav-sub">Net worth bancario con dati fake via Salt Edge</div>
            </div>
          </div>
          <div class="nav-group">
            <button class="nav-btn" onclick="location.href='/'">← Torna alla landing</button>
            <button class="nav-btn-primary" onclick="location.href='/connect_bank'">
              Collega/aggiorna banca fake
            </button>
          </div>
        </header>

        <div class="layout">
          <!-- Pannello sinistro: Net worth + conti -->
          <section class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Net worth bancario (fake)</div>
                <div class="nav-sub" id="cust-id">Customer: —</div>
              </div>
              <span class="pill" id="status-pill">In attesa dati…</span>
            </div>

            <div class="big-value" id="total">— EUR</div>
            <p class="muted">Somma dei saldi dei conti collegati tramite Salt Edge Sandbox.</p>

            <div class="progress-track">
              <div class="progress-bar" id="coverage-bar"></div>
            </div>
            <div class="progress-foot">
              <span>Copertura asset stimata</span>
              <span id="coverage-label">0%</span>
            </div>

            <div class="chips">
              <span class="chip" id="chip-accounts">0 conti collegati</span>
              <span class="chip">Dati letti in sola lettura</span>
              <span class="chip">Nessuna credenziale reale</span>
            </div>

            <h3 style="font-size:13px;margin-top:16px;margin-bottom:6px;">Conti collegati</h3>
            <p class="muted" style="margin-bottom:6px;">Riepilogo dei conti restituiti dall'API Salt Edge.</p>
            <div class="accounts-grid" id="accounts-grid">
              <!-- riempito da JS -->
            </div>

            <div id="error-box" class="error-box" style="display:none;"></div>
          </section>

          <!-- Pannello destro: transazioni -->
          <section class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Ultime transazioni</div>
                <div class="nav-sub" id="tx-count">0 transazioni</div>
              </div>
              <span class="pill-small">Solo lettura · Demo</span>
            </div>

            <div class="table" id="tx-table-wrapper" style="display:none;">
              <div class="table-header">
                <span>Data</span>
                <span>Descrizione</span>
                <span style="text-align:right;">Importo</span>
                <span>Conto</span>
              </div>
              <div id="tx-rows">
                <!-- righe -->
              </div>
            </div>

            <p class="muted" id="tx-empty">
              Collega una banca fake dalla landing per vedere qualche movimento di test.
            </p>
          </section>
        </div>
      </div>

      <script>
        function fmtCurrency(amount) {
          try {
            return new Intl.NumberFormat('it-IT', {
              style: 'currency',
              currency: 'EUR'
            }).format(amount);
          } catch (e) {
            return amount.toFixed(2) + ' EUR';
          }
        }

        fetch('/api/networth')
          .then(r => r.json())
          .then(data => {
            const errorBox = document.getElementById('error-box');

            if (data.error) {
              errorBox.style.display = 'block';
              errorBox.textContent = data.error;
              document.getElementById('status-pill').textContent = 'Errore caricamento';
              document.getElementById('status-pill').style.borderColor = 'rgba(248,113,113,0.8)';
              return;
            }

            const customerId = data.customer_id || '—';
            document.getElementById('cust-id').textContent = 'Customer: ' + customerId;

            const total = data.total_balance || 0;
            document.getElementById('total').textContent = fmtCurrency(total);

            const accounts = data.accounts || [];
            const accCount = accounts.length;
            document.getElementById('chip-accounts').textContent =
              accCount === 1 ? '1 conto collegato' : accCount + ' conti collegati';

            document.getElementById('status-pill').textContent =
              accCount > 0 ? 'Sincronizzato' : 'Nessun conto collegato';

            // Copertura rispetto a 50k per avere un numero sensato
            const coverage = Math.max(0, Math.min(100, Math.round((total / 50000) * 100)));
            document.getElementById('coverage-label').textContent = coverage + '%';
            document.getElementById('coverage-bar').style.width = Math.max(6, coverage) + '%';

            // ---- Accounts cards ----
            const accGrid = document.getElementById('accounts-grid');
            accGrid.innerHTML = '';
            if (accounts.length === 0) {
              accGrid.innerHTML = '<div class="muted">Nessun conto disponibile.</div>';
            } else {
              accounts.forEach(acc => {
                const div = document.createElement('div');
                div.className = 'account-card';

                const name = acc.name || 'Conto';
                const provider = acc.provider || 'Sandbox';
                const type = acc.type || 'account';
                const bal = typeof acc.balance === 'number' ? acc.balance : 0;

                div.innerHTML = `
                  <div class="account-top">
                    <div>
                      <div class="account-name">${name}</div>
                      <div class="account-provider">${provider}</div>
                    </div>
                    <div class="account-balance">${fmtCurrency(bal)}</div>
                  </div>
                  <div class="muted">Tipo: ${type || 'n/d'}</div>
                `;
                accGrid.appendChild(div);
              });
            }

            // ---- TRADE REPUBLIC CARD ----
            if (data.trade_republic) {
                const tr = data.trade_republic;

                const accGrid = document.getElementById('accounts-grid');

                const div = document.createElement('div');
                div.className = 'account-card';

                div.innerHTML = `
                    <div class="account-top">
                        <div>
                            <div class="account-name">Trade Republic</div>
                            <div class="account-provider">Broker</div>
                        </div>
                        <div class="account-balance">${fmtCurrency(tr.total_eur)}</div>
                    </div>
                    <div class="muted">
                        Cash: ${fmtCurrency(tr.cash_eur)}<br>
                        Titoli: ${fmtCurrency(tr.securities_eur)}
                    </div>
                `;

                accGrid.appendChild(div);
            }

            // ---- TRADE REPUBLIC POSITIONS (inside card) ----
            if (data.trade_republic && data.trade_republic.positions) {
                const tr = data.trade_republic;

                // recuperiamo l’ULTIMA card (che è quella di Trade Republic)
                const cards = document.querySelectorAll('.account-card');
                const trCard = cards[cards.length - 1];

                // contenitore posizioni
                const positionsContainer = document.createElement('div');
                positionsContainer.style.marginTop = "10px";

                // toggle
                const toggleBtn = document.createElement('div');
                toggleBtn.textContent = "▼ Mostra posizioni";
                toggleBtn.style.fontSize = "12px";
                toggleBtn.style.cursor = "pointer";
                toggleBtn.style.color = "#9ca3af";
                toggleBtn.style.marginBottom = "6px";

                const tableWrapper = document.createElement('div');
                tableWrapper.className = "tr-table";
                tableWrapper.style.display = "none";

                // header
                const header = document.createElement("div");
                header.className = "tr-table-header";
                header.innerHTML = `
                    <span>ISIN</span>
                    <span>Nome</span>
                    <span>Qtà</span>
                `;
                tableWrapper.appendChild(header);

                // rows
                tr.positions.forEach(p => {
                    const row = document.createElement("div");
                    row.className = "tr-table-row";

                    row.innerHTML = `
                        <span>${p.isin}</span>
                        <span>${p.name}</span>
                        <span>${p.quantity}</span>
                    `;

                    tableWrapper.appendChild(row);
                });

                toggleBtn.onclick = () => {
                    if (tableWrapper.style.display === "none") {
                        tableWrapper.style.display = "block";
                        toggleBtn.textContent = "▲ Nascondi posizioni";
                    } else {
                        tableWrapper.style.display = "none";
                        toggleBtn.textContent = "▼ Mostra posizioni";
                    }
                };

                positionsContainer.appendChild(toggleBtn);
                positionsContainer.appendChild(tableWrapper);
                trCard.appendChild(positionsContainer); // <---- QUESTO È IL PUNTO CHIAVE
            }



            // ---- Transactions ----
            const allTx = [];
            accounts.forEach(acc => {
              (acc.transactions || []).forEach(t => {
                allTx.push({
                  date: t.date || t.made_on || '',
                  desc: t.description || '',
                  amount: t.amount || 0,
                  currency: t.currency || t.currency_code || 'EUR',
                  account: acc.name || 'Conto'
                });
              });
            });

            allTx.sort((a,b) => (b.date || '').localeCompare(a.date || ''));

            const txCount = allTx.length;
            document.getElementById('tx-count').textContent =
              txCount === 0 ? '0 transazioni' :
              (txCount === 1 ? '1 transazione' : txCount + ' transazioni');

            const txWrapper = document.getElementById('tx-table-wrapper');
            const txRows = document.getElementById('tx-rows');
            const txEmpty = document.getElementById('tx-empty');

            if (txCount === 0) {
              txWrapper.style.display = 'none';
              txEmpty.style.display = 'block';
            } else {
              txWrapper.style.display = 'block';
              txEmpty.style.display = 'none';

              txRows.innerHTML = '';
              allTx.slice(0, 18).forEach(tx => {
                const row = document.createElement('div');
                row.className = 'table-row';
                const sign = tx.amount >= 0 ? '' : '-';
                row.innerHTML = `
                  <span>${tx.date || '—'}</span>
                  <span title="${tx.desc}">${tx.desc || '—'}</span>
                  <span style="text-align:right;color:${tx.amount < 0 ? '#f97373' : '#4ade80'};">
                    ${fmtCurrency(Math.abs(tx.amount))}
                  </span>
                  <span title="${tx.account}">${tx.account}</span>
                `;
                txRows.appendChild(row);
              });
            }
          })
          .catch(err => {
            const errorBox = document.getElementById('error-box');
            errorBox.style.display = 'block';
            errorBox.textContent = 'Errore di rete nel contattare /api/networth';
            document.getElementById('status-pill').textContent = 'Errore rete';
          });
      </script>
    </body>
    </html>
    """
    return HTMLResponse(html)