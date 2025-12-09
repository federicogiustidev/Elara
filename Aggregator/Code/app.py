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

app = FastAPI(title="Elara – Salt Edge MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def se_delete(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = BASE_URL + path
    print(f"SE DELETE {url} params={params}")
    resp = requests.delete(
        url,
        headers=COMMON_HEADERS,
        params=params or {},
        timeout=30,
    )
    print("SE STATUS:", resp.status_code)
    print("SE BODY:", resp.text[:500])
    # se vuoi, puoi non fare raise_for_status sul 404
    resp.raise_for_status()
    if resp.text:
        return resp.json()
    return {}

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
    text = extract_text_from_pdf(pdf_bytes)
    lines = text.splitlines()
    for line in lines:
        if "Conto corrente" in line:
            amounts = re.findall(r"(\d{1,3}(?:\.\d{3})*,\d{2})", line)
            if amounts:
                saldo_finale_str = amounts[-1]
                saldo_finale_str = saldo_finale_str.replace(".", "").replace(",", ".")
                return float(saldo_finale_str)

    for line in lines:
        if "Citibank" in line:
            amounts = re.findall(r"(\d{1,3}(?:\.\d{3})*,\d{2})", line)
            if amounts:
                saldo_str = amounts[-1].replace(".", "").replace(",", ".")
                return float(saldo_str)

    raise ValueError("Impossibile leggere il saldo dal PDF cash account.")


def parse_tr_securities_statement(pdf_bytes: bytes) -> float:
    text = extract_text_from_pdf(pdf_bytes)
    lines = text.splitlines()

    for line in lines:
        if "NUMERO DI POSIZIONI" in line:
            amounts = re.findall(r"(\d{1,3}(?:\.\d{3})*,\d{2})", line)
            if amounts:
                total_str = amounts[-1].replace(".", "").replace(",", ".")
                return float(total_str)

    raise ValueError("Impossibile leggere il valore totale titoli dal PDF securities.")


def parse_tr_securities_statement_with_positions(pdf_bytes: bytes):
    text = extract_text_from_pdf(pdf_bytes)
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    total_value = 0.0
    total_regex = re.compile(r"(\d{1,3}(?:\.\d{3})*,\d{2})\s*EUR")
    for line in lines:
        if "NUMERO DI POSIZIONI" in line:
            m = total_regex.search(line)
            if m:
                total_value = float(m.group(1).replace(".", "").replace(",", "."))
                break

    positions = []
    current = {"name": "", "isin": None, "qty": None}

    for line in lines:
        if "IVA" in line or "P. IVA" in line:
          continue
        isin_match = re.search(r"\b([A-Z]{2}[A-Z0-9]{9}\d)\b", line)
        if isin_match:
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

        qty_match = re.search(r"(\d+(?:[\.,]\d+)?)$", line)
        if qty_match and current["isin"]:
            q = qty_match.group(1).replace(",", ".")
            try:
                current["qty"] = float(q)
                continue
            except:
                pass

        if current["isin"]:
            current["name"] += " " + line

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

        STATE["trade_republic"] = {
            "cash_eur": cash_eur,
            "securities_eur": securities_eur,
            "total_eur": total_tr,
            "positions": positions
        }

        return HTMLResponse(
            f"""
            <!doctype html>
            <html lang="it">
            <head>
              <meta charset="utf-8" />
              <title>Importazione completata - Elara</title>
              <style>
                body {{
                  margin: 0;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                  color: #f1f5f9;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                }}
                .container {{
                  background: rgba(30, 41, 59, 0.6);
                  backdrop-filter: blur(20px);
                  border: 1px solid rgba(148, 163, 184, 0.2);
                  border-radius: 24px;
                  padding: 48px;
                  max-width: 500px;
                  text-align: center;
                  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }}
                .icon {{
                  width: 64px;
                  height: 64px;
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 24px;
                  font-size: 32px;
                }}
                h2 {{
                  margin: 0 0 16px;
                  font-size: 28px;
                  font-weight: 600;
                }}
                .stats {{
                  background: rgba(15, 23, 42, 0.5);
                  border-radius: 16px;
                  padding: 24px;
                  margin: 24px 0;
                  border: 1px solid rgba(148, 163, 184, 0.1);
                }}
                .stat-row {{
                  display: flex;
                  justify-content: space-between;
                  margin: 12px 0;
                  font-size: 15px;
                }}
                .stat-label {{
                  color: #94a3b8;
                }}
                .stat-value {{
                  font-weight: 600;
                }}
                a {{
                  display: inline-block;
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  color: white;
                  text-decoration: none;
                  padding: 14px 32px;
                  border-radius: 12px;
                  font-weight: 500;
                  margin-top: 24px;
                  transition: transform 0.2s, box-shadow 0.2s;
                  box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
                }}
                a:hover {{
                  transform: translateY(-2px);
                  box-shadow: 0 15px 30px -5px rgba(59, 130, 246, 0.5);
                }}
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">✓</div>
                <h2>Importazione completata</h2>
                <p style="color: #94a3b8; margin: 0;">Trade Republic è stato collegato con successo</p>
                <div class="stats">
                  <div class="stat-row">
                    <span class="stat-label">Liquidità</span>
                    <span class="stat-value">{cash_eur:,.2f} €</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Titoli</span>
                    <span class="stat-value">{securities_eur:,.2f} €</span>
                  </div>
                  <div class="stat-row" style="border-top: 1px solid rgba(148, 163, 184, 0.1); padding-top: 12px; margin-top: 12px;">
                    <span class="stat-label">Totale</span>
                    <span class="stat-value" style="color: #3b82f6; font-size: 18px;">{total_tr:,.2f} €</span>
                  </div>
                </div>
                <a href='/dashboard'>Vai alla Dashboard</a>
              </div>
            </body>
            </html>
            """
        )

    except Exception as e:
        return HTMLResponse(f"""
            <!doctype html>
            <html lang="it">
            <head>
              <meta charset="utf-8" />
              <title>Errore - Elara</title>
              <style>
                body {{
                  margin: 0;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                  color: #f1f5f9;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  padding: 20px;
                }}
                .container {{
                  background: rgba(30, 41, 59, 0.6);
                  backdrop-filter: blur(20px);
                  border: 1px solid rgba(248, 113, 113, 0.3);
                  border-radius: 24px;
                  padding: 48px;
                  max-width: 500px;
                  text-align: center;
                }}
                pre {{
                  background: rgba(15, 23, 42, 0.8);
                  padding: 20px;
                  border-radius: 12px;
                  text-align: left;
                  overflow-x: auto;
                  color: #f87171;
                  font-size: 13px;
                }}
              </style>
            </head>
            <body>
              <div class="container">
                <h2 style="color: #f87171;">Errore durante l'importazione</h2>
                <pre>{e}</pre>
              </div>
            </body>
            </html>
        """, status_code=500)



@app.get("/import_broker")
def import_broker_page():
    html = """
    <!doctype html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <title>Importa Broker - Elara</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #f1f5f9;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .container {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 24px;
          padding: 48px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        
        h2 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .subtitle {
          color: #94a3b8;
          margin-bottom: 32px;
          font-size: 15px;
        }
        
        form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .file-input-group {
          background: rgba(15, 23, 42, 0.5);
          border: 2px dashed rgba(148, 163, 184, 0.3);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          transition: all 0.3s;
          cursor: pointer;
        }
        
        .file-input-group:hover {
          border-color: rgba(59, 130, 246, 0.5);
          background: rgba(15, 23, 42, 0.7);
        }
        
        .file-input-group label {
          display: block;
          color: #cbd5e1;
          font-weight: 500;
          margin-bottom: 12px;
          font-size: 15px;
        }
        
        input[type="file"] {
          width: 100%;
          padding: 12px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          color: #f1f5f9;
          font-size: 14px;
          cursor: pointer;
        }
        
        input[type="file"]::file-selector-button {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          margin-right: 12px;
        }
        
        button {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
        }
        
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(59, 130, 246, 0.5);
        }
        
        .back-link {
          display: inline-block;
          margin-top: 24px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }
        
        .back-link:hover {
          color: #cbd5e1;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Importa Trade Republic</h2>
        <p class="subtitle">Carica i tuoi estratti conto in formato PDF</p>
        
        <form action="/api/brokers/traderepublic" method="post" enctype="multipart/form-data">
          <div class="file-input-group">
            <label for="cash">📄 Estratto Conto Cassa</label>
            <input type="file" id="cash" name="cash_statement" accept=".pdf" required />
          </div>
          
          <div class="file-input-group">
            <label for="securities">📊 Estratto Conto Titoli</label>
            <input type="file" id="securities" name="securities_statement" accept=".pdf" required />
          </div>
          
          <button type="submit">Importa Estratti Conto</button>
        </form>
        
        <a href="/" class="back-link">← Torna alla home</a>
      </div>
    </body>
    </html>
    """
    return HTMLResponse(html)



# ======================
#  HOME
# ======================

@app.get("/")
def index():
    customer = STATE.get("customer_id") or "nessuno"

    html = f"""
    <!doctype html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <title>Elara – Wealth Intelligence Platform</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * {{
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }}

        body {{
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #f1f5f9;
          min-height: 100vh;
          overflow-x: hidden;
        }}

        .bg-animation {{
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          opacity: 0.4;
          pointer-events: none;
        }}

        .bg-gradient {{
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: float 8s ease-in-out infinite;
        }}

        .gradient-1 {{
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
          top: -250px;
          right: -250px;
        }}

        .gradient-2 {{
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
          bottom: -200px;
          left: -200px;
          animation-delay: 2s;
        }}

        @keyframes float {{
          0%, 100% {{ transform: translateY(0) rotate(0deg); }}
          50% {{ transform: translateY(-20px) rotate(5deg); }}
        }}

        .container {{
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }}

        nav {{
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 0;
          margin-bottom: 80px;
        }}

        .logo {{
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 24px;
          font-weight: 700;
        }}

        .logo-icon {{
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }}

        .nav-links {{
          display: flex;
          gap: 24px;
          align-items: center;
        }}

        .nav-link {{
          color: #94a3b8;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }}

        .nav-link:hover {{
          color: #f1f5f9;
        }}

        .btn {{
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s;
          border: none;
          text-decoration: none;
          display: inline-block;
        }}

        .btn-primary {{
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
        }}

        .btn-primary:hover {{
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(59, 130, 246, 0.5);
        }}

        .btn-secondary {{
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(10px);
          color: #f1f5f9;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }}

        .btn-secondary:hover {{
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(148, 163, 184, 0.4);
        }}

        .hero {{
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          margin-bottom: 120px;
        }}

        .badge {{
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 999px;
          font-size: 13px;
          color: #cbd5e1;
          margin-bottom: 24px;
        }}

        .badge-dot {{
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }}

        @keyframes pulse {{
          0%, 100% {{ opacity: 1; }}
          50% {{ opacity: 0.5; }}
        }}

        h1 {{
          font-size: 56px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.02em;
        }}

        .gradient-text {{
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }}

        .hero-description {{
          font-size: 18px;
          line-height: 1.7;
          color: #94a3b8;
          margin-bottom: 32px;
        }}

        .hero-actions {{
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }}

        .hero-meta {{
          display: flex;
          flex-direction: column;
          gap: 12px;
          color: #64748b;
          font-size: 14px;
        }}

        .hero-meta-item {{
          display: flex;
          align-items: center;
          gap: 8px;
        }}

        .check-icon {{
          width: 20px;
          height: 20px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          font-size: 12px;
        }}

        .dashboard-card {{
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }}

        .card-header {{
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }}

        .card-title {{
          font-size: 14px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }}

        .card-badge {{
          padding: 4px 12px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 999px;
          font-size: 11px;
          color: #94a3b8;
        }}

        .net-worth {{
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }}

        .card-subtitle {{
          font-size: 14px;
          color: #64748b;
          margin-bottom: 24px;
        }}

        .progress-bar {{
          height: 8px;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 12px;
        }}

        .progress-fill {{
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 999px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }}

        .progress-label {{
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 24px;
        }}

        .stats-grid {{
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }}

        .stat-box {{
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 12px;
          padding: 16px;
        }}

        .stat-label {{
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
        }}

        .stat-value {{
          font-size: 16px;
          font-weight: 600;
          color: #f1f5f9;
        }}

        .customer-info {{
          font-size: 12px;
          color: #64748b;
          padding: 12px;
          background: rgba(15, 23, 42, 0.5);
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.1);
        }}

        @media (max-width: 968px) {{
          .hero {{
            grid-template-columns: 1fr;
            gap: 48px;
          }}

          h1 {{
            font-size: 42px;
          }}

          .stats-grid {{
            grid-template-columns: 1fr;
          }}

          .nav-links {{
            gap: 12px;
          }}
        }}
      </style>
    </head>
    <body>
      <div class="bg-animation">
        <div class="bg-gradient gradient-1"></div>
        <div class="bg-gradient gradient-2"></div>
      </div>

      <div class="container">
        <nav>
          <div class="logo">
            <div class="logo-icon">E</div>
            <span>Elara</span>
          </div>
          <div class="nav-links">
            <a href="#" class="nav-link">Prodotto</a>
            <a href="/dashboard" class="nav-link">Dashboard</a>
            <a href="/connect_bank" class="btn btn-primary">Collega Banca</a>
          </div>
        </nav>

        <main class="hero">
          <section>
            <div class="badge">
              <span class="badge-dot"></span>
              <span>Private Beta • Sandbox</span>
            </div>

            <h1>
              Il tuo <span class="gradient-text">Net Worth</span>,<br/>
              unito e ottimizzato.
            </h1>

            <p class="hero-description">
              Elara aggrega i tuoi conti e investimenti, stima il valore dei beni fisici
              e usa modelli quantitativi per suggerirti come riequilibrare il portafoglio
              in modo coerente al tuo profilo di rischio.
            </p>

            <div class="hero-actions">
              <a href="/connect" class="btn btn-primary">Crea Customer</a>
              <a href="/connect_bank" class="btn btn-secondary">Collega Banca Fake</a>
              <a href="/import_broker" class="btn btn-secondary">Importa Broker</a>
            </div>

            <div class="hero-meta">
              <div class="hero-meta-item">
                <span class="check-icon">✓</span>
                <span>Aggregazione multi-conto & stima beni fisici</span>
              </div>
              <div class="hero-meta-item">
                <span class="check-icon">✓</span>
                <span>Sandbox integrata con Salt Edge (solo dati fake)</span>
              </div>
              <div class="hero-meta-item">
                <span class="check-icon">✓</span>
                <span>Zero credenziali reali, solo simulazione sicura</span>
              </div>
            </div>

            <div class="customer-info">
              Customer corrente: <strong>{customer}</strong>
            </div>
          </section>

          <aside>
            <div class="dashboard-card">
              <div class="card-header">
                <span class="card-title">Net Worth Stimato</span>
                <span class="card-badge">Sandbox • Read-only</span>
              </div>

              <div class="net-worth" id="hero-total">— EUR</div>
              <p class="card-subtitle" id="hero-status">In attesa dati…</p>

              <div class="progress-bar">
                <div class="progress-fill" id="hero-progress" style="width: 0%"></div>
              </div>
              <div class="progress-label">
                <span>Copertura asset</span>
                <span id="hero-coverage">0%</span>
              </div>

              <div class="stats-grid">
                <div class="stat-box">
                  <div class="stat-label">Conti & Broker</div>
                  <div class="stat-value">Sandbox</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Beni fisici</div>
                  <div class="stat-value">Presto</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Ottimizzazione</div>
                  <div class="stat-value">AI-Powered</div>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>

      <script>
        fetch('/api/networth')
          .then(r => r.json())
          .then(data => {{
            if (data.error) {{
              document.getElementById('hero-total').textContent = '— EUR';
              document.getElementById('hero-status').textContent = data.error;
              return;
            }}

            const total = data.total_balance || 0;
            const formatter = new Intl.NumberFormat('it-IT', {{
              style: 'currency',
              currency: 'EUR'
            }});

            document.getElementById('hero-total').textContent = formatter.format(total);

            const coverage = Math.max(0, Math.min(100, Math.round((total / 50000) * 100)));
            document.getElementById('hero-coverage').textContent = coverage + '%';
            document.getElementById('hero-progress').style.width = coverage + '%';

            const accountsCount = (data.accounts || []).length;
            const status = accountsCount > 0
              ? `${{accountsCount}} conto/i collegati`
              : 'Nessun conto collegato';
            document.getElementById('hero-status').textContent = status;
          }});
      </script>
    </body>
    </html>
    """
    return HTMLResponse(html)


@app.get("/connect")
def connect_fake():
    try:
        identifier = "elara_fake_user_1"

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

        return HTMLResponse(f"""
            <!doctype html>
            <html lang="it">
            <head>
              <meta charset="utf-8" />
              <title>Customer Creato - Elara</title>
              <style>
                body {{
                  margin: 0;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                  color: #f1f5f9;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                }}
                .container {{
                  background: rgba(30, 41, 59, 0.6);
                  backdrop-filter: blur(20px);
                  border: 1px solid rgba(148, 163, 184, 0.2);
                  border-radius: 24px;
                  padding: 48px;
                  max-width: 500px;
                  text-align: center;
                }}
                h2 {{
                  font-size: 28px;
                  margin-bottom: 16px;
                  color: #f1f5f9;
                }}
                p {{
                  color: #94a3b8;
                  margin-bottom: 24px;
                }}
                code {{
                  background: rgba(15, 23, 42, 0.8);
                  padding: 4px 12px;
                  border-radius: 6px;
                  font-family: monospace;
                  color: #3b82f6;
                }}
                a {{
                  display: inline-block;
                  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                  color: white;
                  text-decoration: none;
                  padding: 14px 32px;
                  border-radius: 12px;
                  font-weight: 500;
                  margin-top: 24px;
                  box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
                }}
              </style>
            </head>
            <body>
              <div class="container">
                <h2>✓ Customer Creato</h2>
                <p>ID: <code>{customer_id}</code></p>
                <a href="/">Torna alla Home</a>
              </div>
            </body>
            </html>
        """)

    except Exception as e:
        return HTMLResponse(f"<pre>{e}</pre>", status_code=500)


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


@app.get("/callback")
def callback(connection_id: str = None, error_class: str = None):
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
                msg += " Sincronizzazione avviata."
            except:
                msg += " Impossibile sincronizzare."

        html = f"""
        <!doctype html>
        <html lang="it">
        <head>
          <meta charset="utf-8" />
          <title>Connessione Completata - Elara</title>
          <style>
            body {{
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              color: #f1f5f9;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }}
            .container {{
              background: rgba(30, 41, 59, 0.6);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(148, 163, 184, 0.2);
              border-radius: 24px;
              padding: 48px;
              max-width: 500px;
              text-align: center;
            }}
            h2 {{
              font-size: 28px;
              margin-bottom: 16px;
            }}
            p {{
              color: #94a3b8;
              margin: 12px 0;
            }}
            a {{
              display: inline-block;
              background: linear-gradient(135deg, #3b82f6, #8b5cf6);
              color: white;
              text-decoration: none;
              padding: 14px 32px;
              border-radius: 12px;
              font-weight: 500;
              margin-top: 24px;
              box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
            }}
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🎉 Connessione Completata</h2>
            <p>{msg}</p>
            <p><strong>Connection ID:</strong> {final_connection_id}</p>
            <p><strong>Attempt ID:</strong> {attempt_id}</p>
            <a href="/dashboard">Vai alla Dashboard</a>
          </div>
        </body>
        </html>
        """
        return HTMLResponse(html)

    except Exception as e:
        return HTMLResponse(f"<pre>{e}</pre>", status_code=500)


@app.get("/api/networth")
def api_networth():
    try:
        customer_id = STATE.get("customer_id")
        if not customer_id:
            return JSONResponse({"error": "Customer non creato"}, status_code=400)

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

            txs = []
            try:
                connection_id = acc.get("connection_id")
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


@app.get("/dashboard")
def dashboard():
    html = """
    <!doctype html>
    <html lang="it">
    <head>
      <meta charset="utf-8" />
      <title>Dashboard - Elara</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #f1f5f9;
          min-height: 100vh;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 24px;
          font-weight: 700;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
        }

        .nav-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          text-decoration: none;
          display: inline-block;
        }

        .btn-secondary {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(10px);
          color: #f1f5f9;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          box-shadow: 0 8px 20px -5px rgba(59, 130, 246, 0.4);
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
        }

        .badge {
          padding: 4px 12px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 999px;
          font-size: 11px;
          color: #94a3b8;
        }

        .big-value {
          font-size: 42px;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subtitle {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 24px;
        }

        .progress-bar {
          height: 8px;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 999px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          padding: 6px 12px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 999px;
          font-size: 12px;
          color: #94a3b8;
        }

        .accounts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-top: 20px;
        }

        .account-card {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.2s;
        }

        .account-card:hover {
          border-color: rgba(59, 130, 246, 0.3);
          background: rgba(15, 23, 42, 0.7);
        }

        .account-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .account-name {
          font-weight: 600;
          font-size: 15px;
        }

        .account-provider {
          font-size: 12px;
          color: #64748b;
        }

        .account-balance {
          font-size: 24px;
          font-weight: 700;
          color: #3b82f6;
          margin-top: 8px;
        }

        .tx-table {
          margin-top: 16px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .tx-header {
          display: grid;
          grid-template-columns: 100px 1fr 120px 100px;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(15, 23, 42, 0.8);
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
        }

        .tx-row {
          display: grid;
          grid-template-columns: 100px 1fr 120px 100px;
          gap: 12px;
          padding: 12px 16px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
          font-size: 13px;
          transition: background 0.2s;
        }

        .tx-row:hover {
          background: rgba(59, 130, 246, 0.05);
        }

        .tx-row span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .amount-positive {
          color: #10b981;
        }

        .amount-negative {
          color: #ef4444;
        }

        .error-box {
          background: rgba(127, 29, 29, 0.3);
          border: 1px solid rgba(248, 113, 113, 0.5);
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
          font-size: 13px;
          color: #fca5a5;
        }

        .tr-positions {
          margin-top: 16px;
        }

        .tr-toggle {
          font-size: 13px;
          color: #94a3b8;
          cursor: pointer;
          padding: 8px 0;
          user-select: none;
        }

        .tr-toggle:hover {
          color: #cbd5e1;
        }

        .tr-table {
          margin-top: 12px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          overflow: hidden;
        }

        .tr-row {
          display: grid;
          grid-template-columns: 120px 1fr 80px;
          gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          font-size: 12px;
        }

        .tr-row:last-child {
          border-bottom: none;
        }

        .tr-header {
          background: rgba(15, 23, 42, 0.8);
          font-weight: 600;
          color: #94a3b8;
        }

        @media (max-width: 1024px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .accounts-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <nav>
          <div class="logo">
            <div class="logo-icon">E</div>
            <span>Elara</span>
          </div>
          <div class="nav-actions">
            <a href="/" class="btn btn-secondary">← Home</a>
            <a href="/connect_bank" class="btn btn-primary">Collega Banca</a>
          </div>
        </nav>

        <div class="grid">
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Net Worth Totale</div>
                <div class="subtitle" id="cust-id">Customer: —</div>
              </div>
              <span class="badge" id="status-pill">Caricamento…</span>
            </div>

            <div class="big-value" id="total">— EUR</div>
            <p class="subtitle">Somma dei conti collegati tramite Salt Edge Sandbox</p>

            <div class="progress-bar">
              <div class="progress-fill" id="coverage-bar" style="width: 0%"></div>
            </div>
            <div class="progress-label">
              <span>Copertura asset</span>
              <span id="coverage-label">0%</span>
            </div>

            <div class="chips">
              <span class="chip" id="chip-accounts">0 conti</span>
              <span class="chip">Sandbox Mode</span>
              <span class="chip">Read-only</span>
            </div>

            <div class="accounts-grid" id="accounts-grid"></div>
            <div id="error-box" class="error-box" style="display:none;"></div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">Ultime Transazioni</div>
                <div class="subtitle" id="tx-count">0 transazioni</div>
              </div>
              <span class="badge">Demo Data</span>
            </div>

            <div class="tx-table" id="tx-table" style="display:none;">
              <div class="tx-header">
                <span>Data</span>
                <span>Descrizione</span>
                <span>Importo</span>
                <span>Conto</span>
              </div>
              <div id="tx-rows"></div>
            </div>

            <p class="subtitle" id="tx-empty">Collega una banca per vedere le transazioni</p>
          </div>
        </div>
      </div>

      <script>
        function fmtCurrency(amount) {
          return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
          }).format(amount);
        }

        fetch('/api/networth')
          .then(r => r.json())
          .then(data => {
            if (data.error) {
              document.getElementById('error-box').style.display = 'block';
              document.getElementById('error-box').textContent = data.error;
              document.getElementById('status-pill').textContent = 'Errore';
              return;
            }

            document.getElementById('cust-id').textContent = 'Customer: ' + (data.customer_id || '—');

            const total = data.total_balance || 0;
            document.getElementById('total').textContent = fmtCurrency(total);

            const accounts = data.accounts || [];
            const accCount = accounts.length;
            document.getElementById('chip-accounts').textContent = accCount + ' conti';
            document.getElementById('status-pill').textContent = accCount > 0 ? 'Sincronizzato' : 'Nessun conto';

            const coverage = Math.max(0, Math.min(100, Math.round((total / 50000) * 100)));
            document.getElementById('coverage-label').textContent = coverage + '%';
            document.getElementById('coverage-bar').style.width = coverage + '%';

            const accGrid = document.getElementById('accounts-grid');
            accGrid.innerHTML = '';

            if (accounts.length === 0) {
              accGrid.innerHTML = '<div class="subtitle">Nessun conto disponibile</div>';
            } else {
              accounts.forEach(acc => {
                const div = document.createElement('div');
                div.className = 'account-card';
                div.innerHTML = `
                  <div class="account-header">
                    <div>
                      <div class="account-name">${acc.name || 'Conto'}</div>
                      <div class="account-provider">${acc.provider || 'Sandbox'}</div>
                    </div>
                  </div>
                  <div class="account-balance">${fmtCurrency(acc.balance || 0)}</div>
                `;
                accGrid.appendChild(div);
              });
            }

            if (data.trade_republic) {
              const tr = data.trade_republic;
              const div = document.createElement('div');
              div.className = 'account-card';
              div.innerHTML = `
                <div class="account-header">
                  <div>
                    <div class="account-name">Trade Republic</div>
                    <div class="account-provider">Broker</div>
                  </div>
                </div>
                <div class="account-balance">${fmtCurrency(tr.total_eur)}</div>
                <div class="subtitle" style="margin-top:12px;">
                  Cash: ${fmtCurrency(tr.cash_eur)} • Titoli: ${fmtCurrency(tr.securities_eur)}
                </div>
                <div class="tr-positions" id="tr-positions"></div>
              `;
              accGrid.appendChild(div);

              if (tr.positions && tr.positions.length > 0) {
                const posContainer = div.querySelector('#tr-positions');
                const toggle = document.createElement('div');
                toggle.className = 'tr-toggle';
                toggle.textContent = '▼ Mostra ' + tr.positions.length + ' posizioni';

                const table = document.createElement('div');
                table.className = 'tr-table';
                table.style.display = 'none';

                const header = document.createElement('div');
                header.className = 'tr-row tr-header';
                header.innerHTML = '<span>ISIN</span><span>Nome</span><span>Quantità</span>';
                table.appendChild(header);

                tr.positions.forEach(p => {
                  const row = document.createElement('div');
                  row.className = 'tr-row';
                  row.innerHTML = `
                    <span>${p.isin}</span>
                    <span title="${p.name}">${p.name}</span>
                    <span>${p.quantity}</span>
                  `;
                  table.appendChild(row);
                });

                toggle.onclick = () => {
                  if (table.style.display === 'none') {
                    table.style.display = 'block';
                    toggle.textContent = '▲ Nascondi posizioni';
                  } else {
                    table.style.display = 'none';
                    toggle.textContent = '▼ Mostra ' + tr.positions.length + ' posizioni';
                  }
                };

                posContainer.appendChild(toggle);
                posContainer.appendChild(table);
              }
            }

            const allTx = [];
            accounts.forEach(acc => {
              (acc.transactions || []).forEach(t => {
                allTx.push({
                  date: t.date || '',
                  desc: t.description || '—',
                  amount: t.amount || 0,
                  account: acc.name || 'Conto'
                });
              });
            });

            allTx.sort((a,b) => (b.date || '').localeCompare(a.date || ''));

            const txCount = allTx.length;
            document.getElementById('tx-count').textContent = txCount + ' transazioni';

            if (txCount === 0) {
              document.getElementById('tx-table').style.display = 'none';
              document.getElementById('tx-empty').style.display = 'block';
            } else {
              document.getElementById('tx-table').style.display = 'block';
              document.getElementById('tx-empty').style.display = 'none';

              const txRows = document.getElementById('tx-rows');
              txRows.innerHTML = '';

              allTx.slice(0, 20).forEach(tx => {
                const row = document.createElement('div');
                row.className = 'tx-row';
                const amountClass = tx.amount >= 0 ? 'amount-positive' : 'amount-negative';
                row.innerHTML = `
                  <span>${tx.date || '—'}</span>
                  <span title="${tx.desc}">${tx.desc}</span>
                  <span class="${amountClass}">${fmtCurrency(tx.amount)}</span>
                  <span title="${tx.account}">${tx.account}</span>
                `;
                txRows.appendChild(row);
              });
            }
          })
          .catch(err => {
            document.getElementById('error-box').style.display = 'block';
            document.getElementById('error-box').textContent = 'Errore di rete';
            document.getElementById('status-pill').textContent = 'Errore';
          });
      </script>
    </body>
    </html>
    """
    return HTMLResponse(html)


@app.get("/reset_customer")
def reset_customer():
    """
    Dev utility: cancella il customer corrente su Salt Edge
    e pulisce lo stato locale, così riparti da zero.
    """
    try:
        customer_id = STATE.get("customer_id")
        if not customer_id:
            return HTMLResponse(
                "<h2>Nessun customer da resettare</h2>"
                "<p>Non c'è un customer attivo in memoria.</p>"
                "<a href='/'>Torna alla home</a>",
                status_code=200
            )

        # DELETE /customers/{id} su API v6
        try:
            se_delete(f"/customers/{customer_id}")
        except requests.HTTPError as e:
            # se fosse già stato cancellato lato Salt Edge, ignoro il 404
            if e.response is None or e.response.status_code != 404:
                raise

        # Pulisco lo stato locale
        STATE["customer_id"] = None
        STATE["trade_republic"] = None

        return HTMLResponse(
            "<h2>Customer resettato ✅</h2>"
            "<p>Il customer demo e tutti i collegamenti (banche fake) "
            "sono stati rimossi. Ora puoi creare un nuovo customer da zero.</p>"
            "<a href='/'>Torna alla home</a>",
            status_code=200
        )

    except Exception as e:
        return HTMLResponse(f"<pre>{e}</pre>", status_code=500)
