import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { findCondition, urgencyLabel } from "../../assets/Data/conditions";
import "./UploadAnalyzePage.css";

// Falls back to the Flask default port from backend/app.py
const DEFAULT_API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001"
).replace(/\/$/, "");

const STORAGE_KEY = "ocf_api_base_url";
const RESULTS_STORAGE_KEY = "ocf_analysis_results_v1";
const FILE_STORAGE_KEY = "ocf_upload_cache_v1";

const ACCEPT = [".png", ".jpg", ".jpeg", "image/png", "image/jpeg"];
const SAMPLE_CODES = ["NOR", "DR", "GLC", "AMD", "WAMD", "CSC", "MEM", "RVO"];

function sanitizeBaseUrl(value) {
  if (!value) return "";
  return value.trim().replace(/\/$/, "");
}

function formatPercent(value) {
  return Number((value * 100).toFixed(1));
}

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToFileEntry(entry) {
  if (!entry || !entry.dataUrl) return null;
  try {
    const [header, data] = entry.dataUrl.split(",");
    if (!data) return null;
    const mimeMatch = header.match(/:(.*?);/);
    const mime = entry.type || (mimeMatch ? mimeMatch[1] : "application/octet-stream");
    const binary = atob(data);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      buffer[i] = binary.charCodeAt(i);
    }
    return new File([buffer], entry.name || "upload", {
      type: mime,
      lastModified: entry.lastModified || Date.now(),
    });
  } catch (error) {
    console.warn("[UploadAnalyze] Failed to restore cached upload", error);
    return null;
  }
}

function buildFileSignature(file) {
  return [file.name, file.size, file.type, file.lastModified].join("::");
}

function filterByAccept(files) {
  return files.filter((f) => {
    const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
    return ACCEPT.includes(f.type) || ACCEPT.includes(ext);
  });
}

async function postForm(endpoint, formData, logDebug) {
  let response;
  try {
    response = await fetch(endpoint, { method: "POST", mode: "cors", body: formData });
  } catch (networkError) {
    logDebug?.("Network error while posting", { endpoint, error: networkError?.message });
    throw new Error(`Unable to reach ${endpoint}. Make sure the AI service is running.`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* ignore JSON parse errors so we can surface a friendlier message */
  }

  if (!response.ok || !payload) {
    logDebug?.("Endpoint returned error", { endpoint, status: response.status, payload });
    throw new Error(
      payload?.error || `AI service returned status ${response.status}. Check the backend logs.`
    );
  }
  return payload;
}

async function requestPrediction(file, modality, baseUrl, logDebug) {
  const endpoint = `${baseUrl}/predict/${modality}`;
  const formData = new FormData();
  formData.append("file", file);
  logDebug?.("Uploading file", { endpoint, modality, filename: file.name });
  const payload = await postForm(endpoint, formData, logDebug);
  logDebug?.("Prediction received", {
    endpoint,
    predicted: payload.predicted_class_name,
    confidence: payload.confidence,
  });
  return {
    filename: file.name || "upload",
    modality: (payload.modality || modality || "fundus").toUpperCase(),
    data: payload,
  };
}

async function requestCombinedPrediction(octFile, fundusFile, baseUrl, logDebug) {
  const endpoint = `${baseUrl}/predict/combined`;
  const formData = new FormData();
  formData.append("oct_file", octFile);
  formData.append("fundus_file", fundusFile);
  logDebug?.("Uploading combined files", {
    endpoint,
    oct_filename: octFile.name,
    fundus_filename: fundusFile.name,
  });
  const payload = await postForm(endpoint, formData, logDebug);
  logDebug?.("Combined prediction received", {
    endpoint,
    oct_diagnosis: payload.summary?.oct_diagnosis,
    fundus_diagnosis: payload.summary?.fundus_diagnosis,
    agreement: payload.summary?.agreement,
  });
  return payload;
}

/** Turn one backend prediction into display rows, highest first. */
function toRows(prediction) {
  if (!prediction) return [];
  const byCode = prediction.all_probabilities;
  if (byCode && typeof byCode === "object") {
    return Object.entries(byCode)
      .filter(([, v]) => typeof v === "number")
      .map(([code, value]) => ({
        code,
        name: findCondition(code)?.short || code,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }
  return Object.entries(prediction.all_probabilities_named || {})
    .filter(([, v]) => typeof v === "number")
    .map(([name, value]) => ({
      code: findCondition(name)?.code || name,
      name: findCondition(name)?.short || name,
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function topCondition(prediction) {
  return (
    findCondition(prediction?.predicted_class) ||
    findCondition(prediction?.predicted_class_name) ||
    null
  );
}

function displayName(prediction) {
  const c = topCondition(prediction);
  return c ? c.name : prediction?.predicted_class_name || "Not available";
}

/** Normalise combined and single results into one card shape. */
function buildCards(combinedResult, results) {
  const cards = [];
  combinedResult.forEach((combined, idx) => {
    const fundus = combined.patient_analysis?.fundus;
    const oct = combined.patient_analysis?.oct;
    const agree =
      typeof combined.summary?.agreement === "boolean"
        ? combined.summary.agreement
        : fundus?.predicted_class === oct?.predicted_class;
    const lead = (fundus?.confidence || 0) >= (oct?.confidence || 0) ? fundus : oct;
    cards.push({
      key: `combined-${idx}`,
      paired: true,
      agree,
      title: agree
        ? displayName(fundus)
        : `${displayName(fundus)} or ${displayName(oct)}`,
      sub: agree
        ? "The fundus and OCT models reached the same answer, which makes this result more reliable than either read alone."
        : `The fundus model leans towards ${displayName(fundus)} and the OCT model towards ${displayName(oct)}. A specialist should look at both images.`,
      kicker: agree ? "Both models agree" : "The models disagree",
      files: `Fundus: ${combined.fundusFile || "—"} · OCT: ${combined.octFile || "—"}`,
      stats: [
        { label: "Fundus", value: fundus?.confidence },
        { label: "OCT", value: oct?.confidence },
      ],
      panels: [
        { title: "Fundus model", kind: "fundus", file: combined.fundusFile, prediction: fundus },
        { title: "OCT model", kind: "oct", file: combined.octFile, prediction: oct },
      ],
      lead: topCondition(lead),
      raw: combined,
    });
  });
  results.forEach((entry, idx) => {
    const data = entry.data || {};
    const kind = (entry.modality || "").toLowerCase() === "oct" ? "oct" : "fundus";
    const title = kind === "oct" ? "OCT model" : "Fundus model";
    cards.push({
      key: `single-${idx}`,
      paired: false,
      agree: true,
      title: displayName(data),
      sub: `Based on one image. Adding the matching ${kind === "oct" ? "fundus photo" : "OCT scan"} lets OcuFusion cross-check this result.`,
      kicker: `${title} · single image`,
      files: entry.filename,
      stats: [{ label: "Score", value: data.confidence }],
      panels: [{ title, kind, file: entry.filename, prediction: data }],
      lead: topCondition(data),
      raw: entry,
    });
  });
  return cards;
}

const UploadIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);
const CheckIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);
const WarnIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l9.5 17h-19z" />
    <path d="M12 10v4M12 17.5v.01" />
  </svg>
);
const Spinner = () => (
  <svg className="ua-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-9-9" />
  </svg>
);

export default function UploadAnalyzePage() {
  const initialBaseUrl =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE_URL
      : DEFAULT_API_BASE_URL;

  const [octFiles, setOctFiles] = useState([]);
  const [fundusFiles, setFundusFiles] = useState([]);
  const [octPreviews, setOctPreviews] = useState([]);
  const [fundusPreviews, setFundusPreviews] = useState([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [combinedResult, setCombinedResult] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [loadingSample, setLoadingSample] = useState(null);

  const [apiBaseUrl, setApiBaseUrl] = useState(initialBaseUrl);
  const [apiInput, setApiInput] = useState(initialBaseUrl);
  const [connOpen, setConnOpen] = useState(false);
  const [health, setHealth] = useState({ state: "unknown", detail: "" });
  const [debugEntries, setDebugEntries] = useState([]);
  const fileDataCacheRef = useRef(new Map());

  const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
  const isMixedContentBlocked = isHttpsPage && /^http:\/\//i.test(apiBaseUrl || "");

  const canAnalyze = (octFiles.length > 0 || fundusFiles.length > 0) && !isAnalyzing;
  const pairs = Math.min(octFiles.length, fundusFiles.length);
  const cards = useMemo(() => buildCards(combinedResult, results), [combinedResult, results]);
  const hasResultsReady = cards.length > 0;

  const logDebug = useCallback((message, data) => {
    const entry = { timestamp: new Date().toLocaleTimeString(), message, data };
    setDebugEntries((prev) => [...prev.slice(-9), entry]);
    if (data !== undefined) {
      console.debug(`[UploadAnalyze] ${message}`, data);
    } else {
      console.debug(`[UploadAnalyze] ${message}`);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  // Restore previously selected uploads so they persist when the user navigates away
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FILE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const restore = (list) => (Array.isArray(list) ? list.map(dataUrlToFileEntry).filter(Boolean) : []);
      const restoredOct = restore(parsed.oct);
      const restoredFundus = restore(parsed.fundus);
      if (restoredOct.length) setOctFiles(restoredOct);
      if (restoredFundus.length) setFundusFiles(restoredFundus);
    } catch (err) {
      console.error("[UploadAnalyze] Failed to restore cached uploads", err);
    }
  }, []);

  // Restore previously saved analysis results (so they persist across navigation)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RESULTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.results)) setResults(parsed.results);
      if (Array.isArray(parsed.combinedResult)) setCombinedResult(parsed.combinedResult);
    } catch (err) {
      console.error("[UploadAnalyze] Failed to restore saved results", err);
    }
  }, []);

  // Persist uploads so they survive soft navigation until reset
  useEffect(() => {
    if (octFiles.length === 0 && fundusFiles.length === 0) {
      window.localStorage.removeItem(FILE_STORAGE_KEY);
      return;
    }
    let cancelled = false;
    async function serializeList(list) {
      return Promise.all(
        list.map(async (file) => {
          const key = buildFileSignature(file);
          let dataUrl = fileDataCacheRef.current.get(key);
          if (!dataUrl) {
            dataUrl = await readFileAsDataUrl(file);
            fileDataCacheRef.current.set(key, dataUrl);
          }
          return { name: file.name, type: file.type, lastModified: file.lastModified, dataUrl };
        })
      );
    }
    (async () => {
      try {
        const payload = { oct: await serializeList(octFiles), fundus: await serializeList(fundusFiles) };
        if (!cancelled) window.localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.error("[UploadAnalyze] Failed to persist uploads", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [octFiles, fundusFiles]);

  // Persist analysis results whenever they change
  useEffect(() => {
    if (!hasResultsReady) {
      window.localStorage.removeItem(RESULTS_STORAGE_KEY);
      return;
    }
    try {
      window.localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify({ results, combinedResult }));
    } catch (err) {
      console.error("[UploadAnalyze] Failed to persist results", err);
    }
  }, [results, combinedResult, hasResultsReady]);

  // Preview URLs for the selected images
  useEffect(() => {
    const urls = octFiles.map((f) => (f.type?.startsWith("image/") ? URL.createObjectURL(f) : null));
    setOctPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [octFiles]);
  useEffect(() => {
    const urls = fundusFiles.map((f) => (f.type?.startsWith("image/") ? URL.createObjectURL(f) : null));
    setFundusPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [fundusFiles]);

  const pingBackend = useCallback(async () => {
    if (!apiBaseUrl) {
      setHealth({ state: "down", detail: "Set the AI service address first." });
      return;
    }
    const target = `${apiBaseUrl}/health`;
    setHealth({ state: "checking", detail: "Checking…" });
    logDebug("Pinging backend", { target });
    try {
      const response = await fetch(target, { method: "GET", mode: "cors" });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      let body = null;
      try {
        body = await response.json();
      } catch {
        /* health may not be JSON on older backends */
      }
      const missing = [];
      if (body && body.fundus_model_loaded === false) missing.push("fundus");
      if (body && body.oct_model_loaded === false) missing.push("OCT");
      setHealth(
        missing.length
          ? { state: "partial", detail: `Connected, but the ${missing.join(" and ")} model is not loaded.` }
          : { state: "up", detail: body?.device ? `Connected · running on ${body.device}` : "Connected" }
      );
      logDebug("Ping successful", body || { status: response.status });
    } catch (error) {
      const message = error?.message || "Ping failed";
      setHealth({ state: "down", detail: `Can't reach ${apiBaseUrl}. Is the Flask service running?` });
      logDebug("Ping failed", { error: message });
    }
  }, [apiBaseUrl, logDebug]);

  // Check the service whenever the address changes
  useEffect(() => {
    pingBackend();
  }, [pingBackend]);

  function applyApiBase() {
    const sanitized = sanitizeBaseUrl(apiInput);
    if (!sanitized) {
      setHealth({ state: "down", detail: "Please enter a valid address." });
      return;
    }
    setApiBaseUrl(sanitized);
    setApiInput(sanitized);
    logDebug("API base URL applied", { sanitized });
  }

  function resetApiBase() {
    setApiBaseUrl(DEFAULT_API_BASE_URL);
    setApiInput(DEFAULT_API_BASE_URL);
    logDebug("API base URL reset", { value: DEFAULT_API_BASE_URL });
  }

  function addFiles(which, incoming) {
    const accepted = filterByAccept(Array.from(incoming || []));
    if (!accepted.length) return;
    (which === "oct" ? setOctFiles : setFundusFiles)((p) => [...p, ...accepted]);
  }

  function handleDrop(e, which) {
    e.preventDefault();
    addFiles(which, e.dataTransfer?.files);
  }

  function handlePick(e, which) {
    addFiles(which, e.target.files);
    e.target.value = null;
  }

  function removeFile(which, idx) {
    (which === "oct" ? setOctFiles : setFundusFiles)((p) => p.filter((_, i) => i !== idx));
  }

  // Load a bundled reference pair as real files so it goes through the real API
  async function loadSample(code) {
    const c = findCondition(code);
    if (!c?.fundus || !c?.oct) return;
    setLoadingSample(code);
    try {
      const toFile = async (url, name) => {
        const blob = await (await fetch(url)).blob();
        return new File([blob], name, { type: blob.type || "image/png", lastModified: Date.now() });
      };
      const [f, o] = await Promise.all([
        toFile(c.fundus, `sample_${code.toLowerCase()}_fundus.png`),
        toFile(c.oct, `sample_${code.toLowerCase()}_oct.png`),
      ]);
      setFundusFiles([f]);
      setOctFiles([o]);
      setServerError(null);
      logDebug("Sample pair loaded", { code });
    } catch {
      setServerError("Couldn't load the sample images.");
    } finally {
      setLoadingSample(null);
    }
  }

  async function analyze() {
    if (!canAnalyze) return;
    if (!apiBaseUrl) {
      setServerError("Set the AI service address under Connection before analyzing.");
      setConnOpen(true);
      return;
    }

    const remainingOct = octFiles.slice(pairs);
    const remainingFundus = fundusFiles.slice(pairs);
    const total = pairs + remainingOct.length + remainingFundus.length;

    setIsAnalyzing(true);
    setProgress({ done: 0, total });
    setResults([]);
    setCombinedResult([]);
    setServerError(null);

    const tick = (value) => {
      setProgress((p) => ({ ...p, done: p.done + 1 }));
      return value;
    };

    try {
      logDebug("Analyze started", { apiBaseUrl, octFiles: octFiles.length, fundusFiles: fundusFiles.length });

      // Pair files in order and send each pair to the combined endpoint
      const combinedResults = [];
      for (let i = 0; i < pairs; i += 1) {
        const combined = await requestCombinedPrediction(octFiles[i], fundusFiles[i], apiBaseUrl, logDebug);
        tick();
        combinedResults.push({ octFile: octFiles[i].name, fundusFile: fundusFiles[i].name, ...combined });
      }

      // Any unpaired files are read on their own
      const individualResults = await Promise.all([
        ...remainingFundus.map((file) => requestPrediction(file, "fundus", apiBaseUrl, logDebug).then(tick)),
        ...remainingOct.map((file) => requestPrediction(file, "oct", apiBaseUrl, logDebug).then(tick)),
      ]);

      setCombinedResult(combinedResults);
      setResults(individualResults);
      setHealth((h) => (h.state === "down" ? { state: "up", detail: "Connected" } : h));
      logDebug("Analysis completed", { combined: combinedResults.length, individual: individualResults.length });
    } catch (error) {
      logDebug("Analyze failed", { error: error?.message });
      setServerError(error.message || "Unexpected error while contacting the AI service.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function reset() {
    setOctFiles([]);
    setFundusFiles([]);
    setResults([]);
    setCombinedResult([]);
    setServerError(null);
    window.localStorage.removeItem(FILE_STORAGE_KEY);
    logDebug("Form reset");
  }

  function buildReportHtml() {
    const dateStr = new Date().toLocaleString();
    const pct = (v) => (typeof v === "number" ? `${formatPercent(v)}%` : "N/A");
    const table = (prediction) =>
      `<table><thead><tr><th>Condition</th><th class="r">Score</th></tr></thead><tbody>${toRows(prediction)
        .map((r) => `<tr><td>${escapeHtml(r.name)}</td><td class="r">${pct(r.value)}</td></tr>`)
        .join("")}</tbody></table>`;

    const sections = cards
      .map((card, idx) => {
        const lead = card.lead;
        return `<section>
  <div class="kicker ${card.agree ? "ok" : "warn"}">${escapeHtml(card.kicker)}</div>
  <h2>${idx + 1}. ${escapeHtml(card.title)}</h2>
  <p class="files">${escapeHtml(card.files)}</p>
  <p>${escapeHtml(card.sub)}</p>
  <div class="cols">${card.panels
    .map(
      (p) => `<div><h3>${escapeHtml(p.title)}</h3><p class="files">Top: ${escapeHtml(
        displayName(p.prediction)
      )} · ${pct(p.prediction?.confidence)}</p>${table(p.prediction)}</div>`
    )
    .join("")}</div>
  ${
    lead
      ? `<div class="meaning"><strong>What this means.</strong> ${escapeHtml(lead.meaning)}<br><strong>Suggested next step: ${escapeHtml(
          urgencyLabel[lead.urgency]
        )}.</strong> ${escapeHtml(lead.next)}</div>`
      : ""
  }
</section>`;
      })
      .join("");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OcuFusion AI · Analysis report</title>
    <style>
      body { font-family: "Schibsted Grotesk", -apple-system, "Segoe UI", sans-serif; margin: 40px; color: #13201f; }
      header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #13201f; padding-bottom:14px; margin-bottom:24px; }
      h1 { margin:0; font-size:22px; }
      .meta { color:#4d5f5d; font-size:13px; }
      section { margin-bottom:28px; padding-bottom:20px; border-bottom:1px solid #c9d3d1; page-break-inside: avoid; }
      h2 { margin:4px 0 6px; font-size:20px; }
      h3 { margin:0 0 4px; font-size:15px; }
      p { margin:0 0 10px; font-size:14px; line-height:1.5; }
      .files { color:#4d5f5d; font-size:12px; font-family: ui-monospace, Menlo, monospace; }
      .kicker { font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; }
      .kicker.ok { color:#1e8c83; } .kicker.warn { color:#a86a10; }
      .cols { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:24px; margin-top:12px; }
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      th, td { text-align:left; padding:5px 0; border-bottom:1px solid #eef2f1; }
      th { border-bottom:1px solid #c9d3d1; }
      .r { text-align:right; font-family: ui-monospace, Menlo, monospace; }
      .meaning { margin-top:14px; background:#f2f7f6; border-radius:8px; padding:12px 14px; font-size:13px; line-height:1.55; }
      .footer { margin-top: 18px; color:#4d5f5d; font-size: 12px; line-height:1.5; }
    </style>
  </head>
  <body>
    <header>
      <div><h1>OcuFusion AI · Analysis report</h1><div class="meta">Generated ${escapeHtml(dateStr)}</div></div>
      <div class="meta">${cards.length} result${cards.length === 1 ? "" : "s"}</div>
    </header>
    ${sections || "<p>No analysis results available.</p>"}
    <div class="footer">These results were produced automatically by OcuFusion AI from the images provided. They are for learning and research only, are not a diagnosis, and do not replace an examination by an eye care professional.</div>
  </body>
</html>`;
  }

  function openReport(print) {
    if (!hasResultsReady) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(buildReportHtml());
    w.document.close();
    if (print) {
      w.onload = () => {
        try {
          w.focus();
        } catch {
          /* ignore */
        }
        w.print();
      };
    }
  }

  const statusLabel = {
    unknown: "Not checked",
    checking: "Checking…",
    up: "Connected",
    partial: "Models missing",
    down: "Offline",
  }[health.state];

  const slots = [
    { key: "fundus", title: "Fundus photo", tag: "FUNDUS", files: fundusFiles, previews: fundusPreviews },
    { key: "oct", title: "OCT scan", tag: "OCT", files: octFiles, previews: octPreviews },
  ];

  return (
    <div className="ua">
      {/* Connection bar */}
      <div className="ua-conn">
        <div className="ua-conn__bar">
          <div>
            <h1 className="ua-title">Analyze</h1>
          </div>
          <button
            type="button"
            className={`ua-status ua-status--${health.state}`}
            onClick={() => setConnOpen((v) => !v)}
            aria-expanded={connOpen}
            aria-controls="ua-conn-panel"
          >
            <span className="ua-status__dot" />
            AI service: {statusLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
        {connOpen && (
          <div id="ua-conn-panel" className="ua-conn__panel">
            <div className="ua-conn__row">
              <label className="ui-label ua-conn__field">
                AI service address
                <input
                  className="ui-input mono"
                  type="url"
                  value={apiInput}
                  onChange={(e) => setApiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyApiBase()}
                  placeholder="http://localhost:5001"
                />
              </label>
              <button type="button" className="ui-btn ui-btn--ghost" onClick={applyApiBase}>
                Apply
              </button>
              <button type="button" className="ui-btn ui-btn--ghost" onClick={resetApiBase}>
                Reset
              </button>
              <button type="button" className="ui-btn ui-btn--ghost" onClick={pingBackend} disabled={health.state === "checking"}>
                Check connection
              </button>
            </div>
            <p className="ua-conn__detail" role="status">
              {health.detail}
            </p>
            {isMixedContentBlocked && (
              <p className="ua-conn__warn">
                This page is loaded over HTTPS but the AI service uses HTTP, which browsers block.
                Run the frontend locally over HTTP or expose the backend over HTTPS.
              </p>
            )}
            {debugEntries.length > 0 && (
              <details className="ua-log">
                <summary>Activity log</summary>
                <div>
                  {debugEntries
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={`${entry.timestamp}-${index}`} className="ua-log__line">
                        <span className="mono">{entry.timestamp}</span>
                        <span>{entry.message}</span>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      <main className="ua-main">
        {/* LEFT: inputs */}
        <section className="ua-inputs" aria-labelledby="ua-in-h">
          <div>
            <h2 id="ua-in-h" className="ua-h2">New analysis</h2>
            <p className="ua-muted">Add a fundus photo, an OCT scan, or both from the same eye.</p>
          </div>

          {slots.map((slot) => (
            <div key={slot.key} className="ua-slot">
              <div className="ua-slot__head">
                <span className={`ua-tag ua-tag--${slot.key}`}>{slot.tag}</span>
                <span className="ua-slot__title">{slot.title}</span>
                {slot.files.length > 0 && (
                  <span className="ua-slot__count mono">{slot.files.length}</span>
                )}
              </div>

              {slot.files.length > 0 && (
                <ul className="ua-files">
                  {slot.files.map((file, i) => (
                    <li key={`${file.name}-${i}`} className="ua-file">
                      <div className="ua-file__thumb">
                        {slot.previews[i] && <img src={slot.previews[i]} alt={`${slot.title} preview: ${file.name}`} />}
                        {isAnalyzing && <span className="ua-scanline" />}
                      </div>
                      <div className="ua-file__meta">
                        <span className="mono ua-file__name" title={file.name}>{file.name}</span>
                        <span className="ua-file__size">
                          {Math.max(1, Math.round(file.size / 1024))} KB
                          {slot.key === "fundus" && i < pairs ? ` · paired with OCT ${i + 1}` : ""}
                          {slot.key === "oct" && i < pairs ? ` · paired with fundus ${i + 1}` : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ua-icon-btn"
                        onClick={() => removeFile(slot.key, i)}
                        aria-label={`Remove ${file.name}`}
                        disabled={isAnalyzing}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <label
                className={`ua-drop ${slot.files.length ? "ua-drop--compact" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, slot.key)}
              >
                <UploadIcon />
                <span>
                  <strong>{slot.files.length ? "Add another" : "Choose a file"}</strong> or drag it here
                </span>
                {!slot.files.length && <span className="ua-drop__sub">PNG or JPG</span>}
                <input
                  className="sr-only"
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={(e) => handlePick(e, slot.key)}
                  aria-label={`Upload ${slot.title.toLowerCase()}`}
                />
              </label>
            </div>
          ))}

          <div className="ua-samples">
            <div className="ua-muted ua-small">No images handy? Load a sample pair:</div>
            <div className="ua-samples__chips">
              {SAMPLE_CODES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="ui-chip ua-chip-sm"
                  onClick={() => loadSample(code)}
                  disabled={isAnalyzing || loadingSample !== null}
                >
                  {loadingSample === code ? "Loading…" : findCondition(code).short}
                </button>
              ))}
            </div>
          </div>

          {pairs > 0 && (
            <div className="ua-note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="12" r="6" />
                <circle cx="15" cy="12" r="6" />
              </svg>
              <span>
                Paired read: {pairs === 1 ? "the fundus photo and OCT scan" : `${pairs} pairs`} will be analyzed together and compared.
                {octFiles.length !== fundusFiles.length && " Extra images are read on their own."}
              </span>
            </div>
          )}

          <div className="ua-actions">
            <button type="button" className="ui-btn ui-btn--primary ua-analyze" onClick={analyze} disabled={!canAnalyze}>
              {isAnalyzing && <Spinner />}
              {isAnalyzing ? "Analyzing…" : pairs > 0 ? "Analyze pair" : "Analyze"}
            </button>
            <button type="button" className="ui-btn ui-btn--ghost" onClick={reset} disabled={isAnalyzing}>
              Reset
            </button>
          </div>
        </section>

        {/* RIGHT: results */}
        <section className="ua-results" aria-labelledby="ua-res-h" aria-live="polite">
          <h2 id="ua-res-h" className="mono ua-results__label">RESULTS</h2>

          {serverError && (
            <div className="ua-error" role="alert">
              <WarnIcon />
              <div>
                <strong>Analysis didn't finish.</strong> {serverError}{" "}
                <button type="button" onClick={() => setConnOpen(true)}>
                  Check connection
                </button>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="ua-panel ua-progress">
              <div className="ua-progress__title">
                <Spinner /> Analyzing {progress.total > 1 ? `${Math.min(progress.done + 1, progress.total)} of ${progress.total}` : "your images"}…
              </div>
              <div className="ua-progress__track">
                <span style={{ width: `${progress.total ? Math.max(8, (progress.done / progress.total) * 100) : 8}%` }} />
              </div>
              <p className="ua-muted ua-small">
                Images are cleaned, then each model scores all nine conditions. Paired images are compared at the end.
              </p>
            </div>
          )}

          {!isAnalyzing && !hasResultsReady && !serverError && (
            <div className="ua-panel ua-empty">
              <svg width="56" height="56" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="16" cy="16" r="14" stroke="#24403f" strokeWidth="1.6" />
                <circle cx="16" cy="16" r="9.5" stroke="#2c5552" strokeWidth="1.6" />
                <circle cx="16" cy="16" r="5" stroke="var(--accent)" strokeWidth="1.6" />
              </svg>
              <h3>Results will appear here</h3>
              <p>Add an image on the left and press Analyze, or load a sample pair to try a full paired read.</p>
            </div>
          )}

          {!isAnalyzing && hasResultsReady && (
            <>
              {cards.map((card) => (
                <article key={card.key} className="ua-result">
                  <div className={`ua-verdict ${card.agree ? "" : "ua-verdict--warn"}`}>
                    <div className="ua-verdict__copy">
                      <div className="ua-verdict__kicker">
                        {card.agree ? <CheckIcon /> : <WarnIcon />}
                        {card.kicker}
                      </div>
                      <h3>{card.title}</h3>
                      <p>{card.sub}</p>
                      <p className="mono ua-verdict__files">{card.files}</p>
                    </div>
                    <div className="ua-verdict__stats">
                      {card.stats.map((s) => (
                        <div key={s.label} className="ua-stat">
                          <span>{s.label}</span>
                          <strong className="mono">{typeof s.value === "number" ? `${formatPercent(s.value)}%` : "N/A"}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ua-panels">
                    {card.panels.map((p) => {
                      const rows = toRows(p.prediction);
                      const top = rows[0]?.code;
                      return (
                        <div key={p.title} className={`ua-panel ua-model ua-model--${p.kind}`}>
                          <div className="ua-model__head">
                            <strong>{p.title}</strong>
                            <span className="ua-muted ua-small">
                              Top: {displayName(p.prediction)} · {typeof p.prediction?.confidence === "number" ? `${formatPercent(p.prediction.confidence)}%` : "N/A"}
                            </span>
                          </div>
                          <ul className="ua-bars">
                            {rows.map((r) => (
                              <li key={r.code} className={r.code === top ? "is-top" : ""}>
                                <span className="ua-bars__name">{r.name}</span>
                                <span className="ua-bars__track">
                                  <span style={{ width: `${Math.max(1, r.value * 100)}%` }} />
                                </span>
                                <span className="mono ua-bars__pct">{formatPercent(r.value)}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  {card.lead && (
                    <div className="ua-panel ua-meaning">
                      <div className="ua-meaning__text">
                        <span className="ua-muted ua-small">What this means</span>
                        <p>{card.lead.meaning}</p>
                      </div>
                      <div className={`ua-next ua-next--${card.lead.urgency}`}>
                        <span className="ua-muted ua-small">Suggested next step</span>
                        <strong>{urgencyLabel[card.lead.urgency]}</strong>
                        <p>{card.lead.next}</p>
                      </div>
                    </div>
                  )}

                  <details className="ua-raw">
                    <summary>Raw response</summary>
                    <pre>{JSON.stringify(card.raw, null, 2)}</pre>
                  </details>
                </article>
              ))}

              <div className="ua-report-actions">
                <button type="button" className="ui-btn ui-btn--primary" onClick={() => openReport(false)}>
                  View report
                </button>
                <button type="button" className="ui-btn ui-btn--ghost" onClick={() => openReport(true)}>
                  Save as PDF
                </button>
              </div>
            </>
          )}

          <p className="ua-disclaimer">
            These results are created automatically by OcuFusion AI from the eye images you upload. Only a
            qualified eye specialist can decide what this means for your health. Please do not start, stop, or
            change any treatment based on this report alone.
          </p>
        </section>
      </main>
    </div>
  );
}
