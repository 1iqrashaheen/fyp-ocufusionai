import React, { useMemo, useState, useEffect } from "react";
import "./uploadAnalyzePage.css";

const DISEASES = [
  "Diabetic Retinopathy",
  "Glaucoma",
  "Age-related Macular Degeneration",
  "Macular Edema",
  "Macular Hole",
  "Retinal Detachment",
  "Central Serous Retinopathy",
  "Hypertensive Retinopathy",
];

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export default function UploadAnalyzePage() {
  const [octFiles, setOctFiles] = useState([]);
  const [fundusFiles, setFundusFiles] = useState([]);

  const [consented, setConsented] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [resetSelected, setResetSelected] = useState(false);
  const [octPreviews, setOctPreviews] = useState([]);
  const [fundusPreviews, setFundusPreviews] = useState([]);
  const [fileResults, setFileResults] = useState({ fundus: [], oct: [] });
  const [serverError, setServerError] = useState(null);

  const canAnalyze = useMemo(
    () =>
      consented &&
      (octFiles.length > 0 || fundusFiles.length > 0) &&
      !isAnalyzing,
    [consented, octFiles, fundusFiles, isAnalyzing]
  );

  const acceptOct = [".dcm", ".dicom", "image/png", "image/jpeg"];
  const acceptFundus = ["image/png", "image/jpeg"];

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

    setIsAnalyzing(true);
    setResults(null);
    setServerError(null);
    setFileResults({ fundus: [], oct: [] });

    const formData = new FormData();
    octFiles.forEach((file) => formData.append("oct_images", file));
    fundusFiles.forEach((file) => formData.append("fundus_images", file));

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (_err) {
        /* ignore JSON parsing errors so we can show a friendly message */
      }

      if (!response.ok || !payload) {
        const message = payload?.error || "Unable to analyze uploads right now.";
        throw new Error(message);
      }

      setResults(payload.results || []);
      setFileResults({
        fundus: payload.files?.fundus || [],
        oct: payload.files?.oct || [],
      });
    } catch (error) {
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
    setResults(null);
    setConsented(false);
    setResetSelected(false);
    setServerError(null);
    setFileResults({ fundus: [], oct: [] });
  }

  function buildReportHtml() {
    const now = new Date();
    const dateStr = now.toLocaleString();
    const rows = (results || []).map(
      ({ name, score }) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e3e7ea;">${name}</td><td style="padding:8px 12px;border:1px solid #e3e7ea;text-align:right;">${score}%</td></tr>`
    );
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
    <table>
      <thead><tr><th>Condition</th><th style="text-align:right;">Probability</th></tr></thead>
      <tbody>
        ${rows.join("\n")}
      </tbody>
    </table>
    <div class="footer">This report is for informational purposes only and not medical advice.</div>
  </body>
</html>`;
  }

  function viewReport() {
    if (!results || results.length === 0) return;
    const html = buildReportHtml();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function downloadReport() {
    if (!results || results.length === 0) return;
    const html = buildReportHtml();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      try { w.focus(); } catch (e) {}
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
                <div className="sub">DICOM, PNG, JPG</div>
              </div>
              <input
                type="file"
                multiple
                onChange={(e) => handlePick(e, "oct")}
                accept=".dcm,.dicom,image/png,image/jpeg"
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
                accept="image/png,image/jpeg"
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
              <div className="image-previews" aria-label="Fundus image previews">
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

          <label className="consent">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
            />
            <span>I consent to the processing of my uploads for analysis</span>
          </label>

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

          {!results && !serverError && (
            <div className="no-results">
              <div className="doc-icon" aria-hidden />
              <div className="no-results-text">
                No results yet — upload to see
              </div>
            </div>
          )}

          {results && (
            <ul className="results">
              {results.map(({ name, score }) => (
                <li key={name} className="result-row">
                  <div className="row-head">
                    <span className="name">{name}</span>
                    <span className="val">{score}%</span>
                  </div>
                  <div
                    className="bar"
                    role="progressbar"
                    aria-label={`${name} probability`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={score}
                  >
                    <div
                      className="bar-fill"
                      style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(fileResults.fundus.length > 0 || fileResults.oct.length > 0) && (
            <div className="file-breakdown">
              {["oct", "fundus"].map((type) =>
                fileResults[type].length > 0 ? (
                  <div key={type} className="file-group">
                    <div className="file-group-title">
                      {type === "oct" ? "OCT scans" : "Fundus images"}
                    </div>
                    <ul>
                      {fileResults[type].map((entry, index) => (
                        <li key={`${type}-${entry.filename}-${index}`}>
                          <div className="file-meta">
                            <strong>{entry.filename}</strong>
                            <span className="file-label">
                              {entry.category} ({entry.confidence.toFixed(1)}%)
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          )}

          {results && results.length > 0 && (
            <div className="actions" style={{ marginTop: 12 }}>
              <button type="button" className="btn ghost" onClick={viewReport}>
                View Report
              </button>
              <button type="button" className="btn primary" onClick={downloadReport}>
                Download PDF
              </button>
            </div>
          )}

          <p className="disclaimer">
            Uploads are used for image analysis. Outputs are for informational
            purposes and not intended as medical advice.
          </p>
        </aside>
      </main>
    </div>
  );
}
