import React, { useMemo, useState, useEffect } from "react";
import "./UploadAnalyzePage.css";

const DEFAULT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  ""
);

const STORAGE_KEY = "ocf_api_base_url";

function sanitizeBaseUrl(value) {
  if (!value) return "";
  return value.trim().replace(/\/$/, "");
}

function formatPercent(value) {
  return Number((value * 100).toFixed(2));
}

async function requestPrediction(file, modality, baseUrl, logDebug) {
  const endpoint = `${baseUrl}/predict/${modality}`;
  const formData = new FormData();
  formData.append("file", file);

  logDebug?.("Uploading file", {
    endpoint,
    modality,
    filename: file.name,
  });

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      body: formData,
    });
  } catch (networkError) {
    logDebug?.("Network error while posting", {
      endpoint,
      error: networkError?.message,
    });
    throw new Error(
      `Unable to reach ${endpoint}. Ensure the remote server/tunnel is online.`
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    /* ignore JSON parse errors so we can surface a friendlier message */
  }

  if (!response.ok || !payload) {
    logDebug?.("Endpoint returned error", {
      endpoint,
      status: response.status,
      payload,
    });
    const message =
      payload?.error ||
      `AI service returned status ${response.status}. Check the backend logs.`;
    throw new Error(message);
  }

  logDebug?.("Prediction received", {
    endpoint,
    status: response.status,
    predicted: payload.predicted_class_name,
    confidence: payload.confidence,
  });

  return {
    filename: file.name || "upload",
    modality: (payload.modality || modality || "fundus").toUpperCase(),
    data: payload,
  };
}

export default function UploadAnalyzePage() {
  const initialBaseUrl =
    typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE_URL
      : DEFAULT_API_BASE_URL;

  const [octFiles, setOctFiles] = useState([]);
  const [fundusFiles, setFundusFiles] = useState([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState([]);
  const [resetSelected, setResetSelected] = useState(false);
  const [octPreviews, setOctPreviews] = useState([]);
  const [fundusPreviews, setFundusPreviews] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(initialBaseUrl);
  const [apiInput, setApiInput] = useState(initialBaseUrl);
  const [debugEntries, setDebugEntries] = useState([]);
  const [pingStatus, setPingStatus] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const isHttpsPage =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const devProxyTarget = import.meta.env.VITE_DEV_API_PROXY || "";
  const devProxyPath =
    import.meta.env.VITE_DEV_API_PROXY_PATH || "/__local_api";
  const hasDevProxy = Boolean(devProxyTarget);
  const isMixedContentBlocked =
    isHttpsPage && /^http:\/\//i.test(apiBaseUrl || "");

  const canAnalyze = useMemo(
    () => (octFiles.length > 0 || fundusFiles.length > 0) && !isAnalyzing,
    [octFiles, fundusFiles, isAnalyzing]
  );

  const acceptOct = [".png", ".jpg", ".jpeg", "image/png", "image/jpeg"];
  const acceptFundus = [".png", ".jpg", ".jpeg", "image/png", "image/jpeg"];

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, apiBaseUrl);
    }
  }, [apiBaseUrl]);

  function logDebug(message, data) {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      data,
    };
    setDebugEntries((prev) => [...prev.slice(-9), entry]);
    if (data !== undefined) {
      console.debug(`[UploadAnalyze] ${message}`, data);
    } else {
      console.debug(`[UploadAnalyze] ${message}`);
    }
  }

  function applyApiBase() {
    const sanitized = sanitizeBaseUrl(apiInput);
    if (!sanitized) {
      setServerError("Please enter a valid API base URL.");
      return;
    }
    setServerError(null);
    setApiBaseUrl(sanitized);
    setApiInput(sanitized);
    logDebug("API base URL applied", { sanitized });
  }

  function resetApiBase() {
    setApiBaseUrl(DEFAULT_API_BASE_URL);
    setApiInput(DEFAULT_API_BASE_URL);
    logDebug("API base URL reset", { value: DEFAULT_API_BASE_URL });
  }

  async function pingBackend() {
    if (!apiBaseUrl) {
      setPingStatus("Set the API base URL first.");
      return;
    }
    const target = `${apiBaseUrl}/health`;
    setIsPinging(true);
    setPingStatus("Pinging...");
    logDebug("Pinging backend", { target });
    try {
      const response = await fetch(target, { method: "GET", mode: "cors" });
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }
      setPingStatus("Reachable");
      logDebug("Ping successful", { status: response.status });
    } catch (error) {
      const message = error?.message || "Ping failed";
      setPingStatus(`Ping failed: ${message}`);
      logDebug("Ping failed", { error: message });
    } finally {
      setIsPinging(false);
    }
  }

  // Build preview URLs for image files only (skip DICOM)
  useEffect(() => {
    const urls = octFiles.map((f) =>
      f.type && f.type.startsWith("image/") ? URL.createObjectURL(f) : null
    );
    setOctPreviews(urls);
    return () => {
      urls.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [octFiles]);

  useEffect(() => {
    const urls = fundusFiles.map((f) =>
      f.type && f.type.startsWith("image/") ? URL.createObjectURL(f) : null
    );
    setFundusPreviews(urls);
    return () => {
      urls.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [fundusFiles]);

  function filesFromEvent(e) {
    const fl = e.target?.files || e.dataTransfer?.files || [];
    return Array.from(fl);
  }
  function filterByAccept(fs, accepts) {
    return fs.filter((f) => {
      const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
      return accepts.includes(f.type) || accepts.includes(ext);
    });
  }
  function handleDrop(e, which) {
    e.preventDefault();
    const incoming = filesFromEvent(e);
    if (which === "oct")
      setOctFiles((p) => [...p, ...filterByAccept(incoming, acceptOct)]);
    else
      setFundusFiles((p) => [...p, ...filterByAccept(incoming, acceptFundus)]);
  }
  function handlePick(e, which) {
    const incoming = filesFromEvent(e);
    if (which === "oct")
      setOctFiles((p) => [...p, ...filterByAccept(incoming, acceptOct)]);
    else
      setFundusFiles((p) => [...p, ...filterByAccept(incoming, acceptFundus)]);
    e.target.value = null;
  }
  function removeFile(which, idx) {
    if (which === "oct") setOctFiles((p) => p.filter((_, i) => i !== idx));
    else setFundusFiles((p) => p.filter((_, i) => i !== idx));
  }

  async function analyze() {
    if (!canAnalyze) return;
    if (!apiBaseUrl) {
      setServerError(
        "Set the API base URL in the debug panel before analyzing."
      );
      return;
    }

    setIsAnalyzing(true);
    setResults([]);
    setServerError(null);

    try {
      logDebug("Analyze started", {
        apiBaseUrl,
        octFiles: octFiles.length,
        fundusFiles: fundusFiles.length,
      });

      const jobs = [
        ...octFiles.map((file) => ({ file, modality: "oct" })),
        ...fundusFiles.map((file) => ({ file, modality: "fundus" })),
      ];

      if (jobs.length === 0) {
        logDebug("No files queued for analysis");
        return;
      }

      const responses = await Promise.all(
        jobs.map(({ file, modality }) =>
          requestPrediction(file, modality, apiBaseUrl, logDebug)
        )
      );

      logDebug("Predictions completed", { count: responses.length });
      setResults(responses);
    } catch (error) {
      logDebug("Analyze failed", { error: error?.message });
      setServerError(
        error.message || "Unexpected error while contacting the AI service."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function reset() {
    setOctFiles([]);
    setFundusFiles([]);
    setResults([]);
    setResetSelected(false);
    setServerError(null);
    logDebug("Form reset");
  }

  function buildReportHtml() {
    const now = new Date();
    const dateStr = now.toLocaleString();
    const sections =
      results.length === 0
        ? "<p>No analysis results available.</p>"
        : results
            .map(({ filename, data }) => {
              const predicted = data?.predicted_class_name || "Unknown";
              const confidence =
                typeof data?.confidence === "number"
                  ? `${formatPercent(data.confidence)}%`
                  : "N/A";
              const probabilityRows = Object.entries(
                data?.all_probabilities_named || {}
              )
                .map(
                  ([name, value]) =>
                    `<tr><td style="padding:6px 10px;border:1px solid #e3e7ea;">${name}</td><td style="padding:6px 10px;border:1px solid #e3e7ea;text-align:right;">${formatPercent(
                      typeof value === "number" ? value : 0
                    )}%</td></tr>`
                )
                .join("");
              return `<section style="margin-bottom:24px;">
  <h2 style="margin:0 0 4px;font-size:18px;">${filename}</h2>
  <div style="color:#49606b;font-size:14px;margin-bottom:8px;">Most likely condition (AI): <strong>${predicted}</strong> (AI is ${confidence} sure)</div>
  <table style="border-collapse:collapse;width:100%;font-size:14px;">
    <thead><tr><th style="text-align:left;padding:6px 10px;border:1px solid #e3e7ea;">Condition</th><th style="text-align:right;padding:6px 10px;border:1px solid #e3e7ea;">Chance (%)</th></tr></thead>
    <tbody>${probabilityRows}</tbody>
  </table>
</section>`;
            })
            .join("");
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Ocufusion AI — Analysis Report</title>
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #1b2a2f; }
      h1 { margin: 0 0 6px; font-size: 22px; }
      .meta { color:#6b7c85; font-size: 14px; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th { text-align: left; background:#f6fafb; border:1px solid #e3e7ea; padding:8px 12px; }
      tfoot td { font-weight: 600; }
      .footer { margin-top: 18px; color:#6b7c85; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>Ocufusion AI — Analysis Report</h1>
    <div class="meta">Generated: ${dateStr}</div>
    ${sections}
    <div class="footer">These results are created automatically by OcuFusion AI from the eye images you uploaded. They are for learning and research only and do not replace a consultation with a qualified eye specialist.</div>
  </body>
</html>`;
  }

  function viewReport() {
    if (results.length === 0) return;
    const html = buildReportHtml();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function downloadReport() {
    if (results.length === 0) return;
    const html = buildReportHtml();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      try {
        w.focus();
      } catch (e) {}
      w.print();
    };
  }

  return (
    <div className="ocf-page">
      {/* (Navbar removed) */}

      <div className="ocf-badge">
        <span className="check" aria-hidden>
          ✔
        </span>
        24/7 Diagnostic Assistance Available
      </div>

      <main className="ocf-grid">
        {/* LEFT: Uploads */}
        <section className="ocf-card">
          <h1 className="ocf-title">Upload &amp; Analyze</h1>

          <div className="ocf-block">
            <h2>Upload your OCT scans</h2>
            <div
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "oct")}
            >
              <div className="drop-icon" aria-hidden />
              <div className="drop-text">
                <strong>Select files</strong> or drag &amp; drop
                <div className="sub">PNG, JPG</div>
              </div>
              <input
                type="file"
                multiple
                onChange={(e) => handlePick(e, "oct")}
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                aria-label="Upload OCT scans"
              />
            </div>

            {octFiles.length > 0 && (
              <div className="file-pills">
                {octFiles.map((f, i) => (
                  <button
                    key={i}
                    className="pill"
                    title={f.name}
                    onClick={() => removeFile("oct", i)}
                    type="button"
                  >
                    <span className="dot" /> {f.name}
                    <span className="x" aria-hidden>
                      ×
                    </span>
                  </button>
                ))}
              </div>
            )}
            {octPreviews.some(Boolean) && (
              <div className="image-previews" aria-label="OCT image previews">
                {octPreviews.map((src, i) =>
                  src ? (
                    <img
                      key={i}
                      src={src}
                      alt={octFiles[i]?.name || "OCT preview"}
                      className="image-preview"
                    />
                  ) : null
                )}
              </div>
            )}
          </div>

          <div className="ocf-block">
            <h2>Upload your fundus images</h2>
            <div
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, "fundus")}
            >
              <div className="drop-icon" aria-hidden />
              <div className="drop-text">
                <strong>Upload your fundus</strong>
                <div className="sub">PNG, JPG</div>
              </div>
              <input
                type="file"
                multiple
                onChange={(e) => handlePick(e, "fundus")}
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                aria-label="Upload fundus images"
              />
            </div>

            <div className="file-pills">
              {fundusFiles.map((f, i) => (
                <button
                  key={i}
                  className="pill"
                  title={f.name}
                  onClick={() => removeFile("fundus", i)}
                  type="button"
                >
                  <span className="dot" /> {f.name}
                  <span className="x" aria-hidden>
                    ×
                  </span>
                </button>
              ))}
            </div>
            {fundusPreviews.some(Boolean) && (
              <div
                className="image-previews"
                aria-label="Fundus image previews"
              >
                {fundusPreviews.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={fundusFiles[i]?.name || "Fundus preview"}
                    className="image-preview"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="actions">
            <button
              className={`btn primary ${!canAnalyze ? "disabled" : ""}`}
              onClick={analyze}
              disabled={!canAnalyze}
            >
              {isAnalyzing ? "Analyzing…" : "Analyze"}
            </button>

            <button
              className={`btn ghost ${resetSelected ? "selected" : ""}`}
              aria-pressed={resetSelected}
              onClick={() => {
                setResetSelected((v) => !v);
                reset();
              }}
            >
              Reset
            </button>
          </div>
        </section>

        {/* RIGHT: Results */}
        <aside className="ocf-card">
          <h1 className="ocf-title">Results</h1>

          {serverError && (
            <div className="status-banner error" role="alert">
              {serverError}
            </div>
          )}

          {results.length === 0 && !serverError && (
            <div className="no-results">
              <div className="doc-icon" aria-hidden />
              <div className="no-results-text">
                No results yet — upload to see
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="prediction-cards">
              {results.map((entry, idx) => {
                const payload = entry.data || {};
                const probabilityEntries = Object.entries(
                  payload.all_probabilities_named || {}
                ).filter(([, value]) => typeof value === "number");
                const sortedProbabilities = probabilityEntries.sort(
                  (a, b) => Number(b[1]) - Number(a[1])
                );
                const confidence =
                  typeof payload.confidence === "number"
                    ? formatPercent(payload.confidence)
                    : null;

                return (
                  <article
                    key={`${entry.filename}-${idx}`}
                    className="prediction-card"
                  >
                    <div className="prediction-card-head">
                      <div>
                        <div className="file-name">{entry.filename}</div>
                        <div className="file-sub">
                          Most likely condition (AI):{" "}
                          <strong>
                            {payload.predicted_class_name || "Not available"}
                          </strong>
                        </div>
                      </div>
                      {confidence !== null && (
                        <div className="confidence-pill">
                          AI is {confidence}% sure
                        </div>
                      )}
                    </div>

                    <div className="prediction-summary">
                      <div className="summary-item">
                        <span>Most likely condition (AI)</span>
                        <strong>
                          {payload.predicted_class_name || "Not available"}
                        </strong>
                      </div>
                      <div className="summary-item">
                        <span>How sure the AI is</span>
                        <strong>
                          {confidence !== null
                            ? `${confidence}%`
                            : "Not available"}
                        </strong>
                      </div>
                    </div>

                    <table className="probability-table">
                      <thead>
                        <tr>
                          <th>Condition</th>
                          <th style={{ width: "110px" }}>Chance (%)</th>
                          <th aria-hidden />
                        </tr>
                      </thead>
                      <tbody>
                        {sortedProbabilities.map(([name, value]) => {
                          const percent = formatPercent(Number(value));
                          return (
                            <tr key={`${entry.filename}-${name}`}>
                              <td>{name}</td>
                              <td className="probability-cell">
                                <span>{percent}%</span>
                              </td>
                              <td className="probability-bar-cell">
                                <div
                                  className="bar"
                                  role="progressbar"
                                  aria-label={`${name} chance`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={percent}
                                >
                                  <div
                                    className="bar-fill"
                                    style={{
                                      width: `${Math.max(
                                        0,
                                        Math.min(100, percent)
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <details className="raw-json">
                      <summary>Raw JSON response</summary>
                      <pre>{JSON.stringify(payload, null, 2)}</pre>
                    </details>
                  </article>
                );
              })}
            </div>
          )}

          {results.length > 0 && (
            <div className="actions" style={{ marginTop: 12 }}>
              <button type="button" className="btn ghost" onClick={viewReport}>
                View Report
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={downloadReport}
              >
                Download PDF
              </button>
            </div>
          )}

          <p className="disclaimer">
            These results are created automatically by OcuFusion AI from the eye
            images you upload. Only a qualified eye specialist can decide what
            this means for your health. Please do not start, stop, or change any
            treatment based on this report alone.
          </p>

          <section className="debug-panel">
            <div className="debug-panel-header">Connection debug</div>
            <label className="debug-label" htmlFor="api-base-input">
              API base URL
            </label>
            <div className="debug-row">
              <input
                id="api-base-input"
                type="text"
                className="debug-input"
                value={apiInput}
                onChange={(e) => setApiInput(e.target.value)}
                placeholder="https://your-server.ngrok-free.app"
              />
              <button
                type="button"
                className="btn ghost"
                onClick={applyApiBase}
              >
                Apply
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={resetApiBase}
              >
                Reset
              </button>
            </div>

            {isMixedContentBlocked && (
              <p className="debug-hint error">
                This site is loaded over HTTPS but the API base uses HTTP.
                Modern browsers block that combination. Run the frontend locally
                over HTTP or expose the backend via HTTPS before pinging.
              </p>
            )}
            {/* 
            {!isMixedContentBlocked && hasDevProxy && (
              <p className="debug-hint">
                Tip: keep the API base set to <code>{devProxyPath}</code> while
                developing locally. Vite proxies that path to your backend at{" "}
                <code>{devProxyTarget}</code>, so no extra tunnelling or CORS
                setup is required.
              </p>
            )} */}

            <div className="debug-row">
              <button
                type="button"
                className="btn primary"
                onClick={pingBackend}
                disabled={isPinging}
              >
                {isPinging ? "Pinging…" : "Ping server"}
              </button>
              {pingStatus && <span className="debug-status">{pingStatus}</span>}
            </div>

            {debugEntries.length > 0 && (
              <div className="debug-log">
                {debugEntries
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div
                      key={`${entry.timestamp}-${index}`}
                      className="debug-line"
                    >
                      <strong>{entry.timestamp}</strong>
                      <span>{entry.message}</span>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}
