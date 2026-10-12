# run backend and frontend

## Vercel deployment

Frontend production: https://ocufusion-ai.vercel.app

Vercel project: `ocufusion-ai` in `iqras-projects-1121dd52`.
For GitHub deployments, use root directory `ocufusion-ai`, framework Vite,
build command `npm run build`, and output directory `dist`.
`ocufusion-ai/vercel.json` handles direct navigation to React routes.

The Python AI backend is pending deployment until model checkpoints are available.
Once it is hosted with HTTPS, set `VITE_API_BASE_URL` in the Vercel project's
production environment to that service's URL and redeploy the frontend.
Ensure the backend permits requests from `https://ocufusion-ai.vercel.app`.
For Google/Facebook sign-in, add `ocufusion-ai.vercel.app` to Firebase
Authentication's authorized domains for project `vrtryon-demo`.

To deploy local changes after the project is configured with that root directory,
run `npx vercel --prod` from the repository root (link the root to the same
Vercel project when prompted).

Backend

cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env and tweak ports/model paths if needed.
python app.py (Flask serves on http://localhost:5001 by default).
Quick sanity: curl http://localhost:5001/health should return JSON with model status.
Frontend

for vscode:

cd backend
python -m venv .venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python app.py

# ocufusion-ai

In another terminal:
cd ocufusion-ai
npm install
cp .env.example .env (or set VITE_API_BASE_URL to your Flask URL).
npm run dev (Vite opens http://localhost:5173).
