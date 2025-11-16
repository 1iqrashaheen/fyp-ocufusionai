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

### Local-only workflow (backend + frontend on same machine)

1. Ensure your backend listens on `http://127.0.0.1:5001` (or update `VITE_DEV_API_PROXY` in `.env` to match the port you use) **and** exposes `GET /health` + `POST /predict/...`.
2. Leave `VITE_API_BASE_URL=/__local_api` and `VITE_DEV_API_PROXY_PATH=/__local_api` in `.env`. The Vite dev server will proxy any request that starts with `/__local_api` to your backend, so there are no CORS issues.
3. Run `npm run dev` (Vite opens http://localhost:5173) and use the debug panel to keep `/__local_api` as the API base. The Ping button now works because the request never leaves the dev server origin.

### Remote / deployed workflow

If you want to connect to a backend that is reachable from the public internet (for example an ngrok tunnel or a deployed API):

1. Update `VITE_API_BASE_URL` (or use the debug panel) with the HTTPS URL, e.g. `https://your-ngrok-subdomain.ngrok-free.app`.
2. Remove or comment out `VITE_DEV_API_PROXY` in `.env` so the proxy is disabled.
3. Rebuild/deploy the frontend. The Upload & Analyze page will call the full URL you provided.
