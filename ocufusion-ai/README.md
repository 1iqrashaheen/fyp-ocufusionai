# run backend and frontend

Backend

cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env and tweak ports/model paths if needed.
python app.py (Flask serves on http://localhost:5001 by default).
Quick sanity: curl http://localhost:5001/health should return JSON with model status.
Frontend

# ocufusion-ai

In another terminal:
cd ocufusion-ai
npm install
cp .env.example .env (or set VITE_API_BASE_URL to your Flask URL).
npm run dev (Vite opens http://localhost:5173).
