import React, { useMemo, useState, useEffect, useRef } from "react";
import "./UploadAnalyzePage.css";
/* Legacy explanation service import (commented per request)
import {
  fetchReportExplanation,
  isExplanationConfigured as explanationConfigAvailable,
} from "../../utils/explanationService";
*/
// import {
//   fetchReportExplanation,
//   isExplanationConfigured as explanationConfigAvailable,
// } from "../../utils/explanationService";

const DEFAULT_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  ""
);

const STORAGE_KEY = "ocf_api_base_url";
const RESULTS_STORAGE_KEY = "ocf_analysis_results_v1";
const FILE_STORAGE_KEY = "ocf_upload_cache_v1";

function sanitizeBaseUrl(value) {
  if (!value) return "";
  return value.trim().replace(/\/$/, "");
}

function formatPercent(value) {
  return Number((value * 100).toFixed(2));
}

/* Legacy explanation payload builder retained for reference:
function buildExplanationPayload(results, combinedResult) {
  return {
    generatedAt: new Date().toISOString(),
    individual: Array.isArray(results) ? results : [],
    combined: Array.isArray(combinedResult) ? combinedResult : [],
  };
}
*/

function buildExplanationPayload(results, combinedResult) {
  return {
    generatedAt: new Date().toISOString(),
    individual: Array.isArray(results) ? results : [],
    combined: Array.isArray(combinedResult) ? combinedResult : [],
  };
}

function escapeHtml(text = "") {
  return text
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
    const mime =
      entry.type || (mimeMatch ? mimeMatch[1] : "application/octet-stream");
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

async function requestCombinedPrediction(
  octFile,
  fundusFile,
  baseUrl,
  logDebug
) {
  const endpoint = `${baseUrl}/predict/combined`;
  const formData = new FormData();
  formData.append("oct_file", octFile);
  formData.append("fundus_file", fundusFile);

  logDebug?.("Uploading combined files", {
    endpoint,
    oct_filename: octFile.name,
    fundus_filename: fundusFile.name,
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
    /* ignore JSON parse errors */
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

  logDebug?.("Combined prediction received", {
    endpoint,
    status: response.status,
    oct_diagnosis: payload.summary?.oct_diagnosis,
    fundus_diagnosis: payload.summary?.fundus_diagnosis,
    agreement: payload.summary?.agreement,
  });

  return payload;
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
  const [combinedResult, setCombinedResult] = useState([]);
  const [resetSelected, setResetSelected] = useState(false);
  const [octPreviews, setOctPreviews] = useState([]);
  const [fundusPreviews, setFundusPreviews] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(initialBaseUrl);
  const [apiInput, setApiInput] = useState(initialBaseUrl);
  const [debugEntries, setDebugEntries] = useState([]);
  const [pingStatus, setPingStatus] = useState(null);
  const [isPinging, setIsPinging] = useState(false);
  const [explanationText, setExplanationText] = useState("");
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState(null);
  const explanationPromiseRef = useRef(null);
  const fileDataCacheRef = useRef(new Map());

  const explanationConfigReady = explanationConfigAvailable();
  /* Previous explanation payload memoization
  const explanationPayload = useMemo(
    () => buildExplanationPayload(results, combinedResult),
    [results, combinedResult]
  );
  */
  const explanationPayload = useMemo(
    () => buildExplanationPayload(results, combinedResult),
    [results, combinedResult]
  );
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
  const hasResultsReady = useMemo(
    () => results.length > 0 || combinedResult.length > 0,
    [results, combinedResult]
  );

  const acceptOct = [".png", ".jpg", ".jpeg", "image/png", "image/jpeg"];
  const acceptFundus = [".png", ".jpg", ".jpeg", "image/png", "image/jpeg"];

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, apiBaseUrl);
    }
  }, [apiBaseUrl]);

  // Restore previously selected uploads so they persist when the user navigates away
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(FILE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.oct) && parsed.oct.length > 0) {
        const restoredOct = parsed.oct
          .map((entry) => dataUrlToFileEntry(entry))
          .filter(Boolean);
        if (restoredOct.length > 0) {
          setOctFiles(restoredOct);
        }
      }
      if (Array.isArray(parsed.fundus) && parsed.fundus.length > 0) {
        const restoredFundus = parsed.fundus
          .map((entry) => dataUrlToFileEntry(entry))
          .filter(Boolean);
        if (restoredFundus.length > 0) {
          setFundusFiles(restoredFundus);
        }
      }
    } catch (err) {
      console.error("[UploadAnalyze] Failed to restore cached uploads", err);
    }
  }, []);

  // Restore previously saved analysis results (so they persist across navigation)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(RESULTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.results)) {
        setResults(parsed.results);
      }
      if (Array.isArray(parsed.combinedResult)) {
        setCombinedResult(parsed.combinedResult);
      }
    } catch (err) {
      console.error("[UploadAnalyze] Failed to restore saved results", err);
    }
  }, []);

  // Persist uploads so they survive soft navigation until reset
  useEffect(() => {
    if (typeof window === "undefined") return;
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
          return {
            name: file.name,
            type: file.type,
            lastModified: file.lastModified,
            dataUrl,
          };
        })
      );
    }

    async function persistUploads() {
      try {
        const payload = {
          oct: await serializeList(octFiles),
          fundus: await serializeList(fundusFiles),
        };
        if (!cancelled) {
          window.localStorage.setItem(
            FILE_STORAGE_KEY,
            JSON.stringify(payload)
          );
        }
      } catch (err) {
        console.error("[UploadAnalyze] Failed to persist uploads", err);
      }
    }

    persistUploads();
    return () => {
      cancelled = true;
    };
  }, [octFiles, fundusFiles]);

  // Persist analysis results whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasResults = results.length > 0 || combinedResult.length > 0;

    // If we have no results, clear storage
    if (!hasResults) {
      window.localStorage.removeItem(RESULTS_STORAGE_KEY);
      return;
    }

    try {
      const payload = {
        results,
        combinedResult,
      };
      window.localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error("[UploadAnalyze] Failed to persist results", err);
    }
  }, [results, combinedResult]);

  /* Previous explanation generation effect (commented per request)
  useEffect(() => {
    if (!hasResultsReady) {
      setExplanationText("");
      setExplanationError(null);
      explanationPromiseRef.current = null;
      setIsGeneratingExplanation(false);
      return;
    }

    if (!explanationConfigReady) {
      setExplanationText("");
      setExplanationError(
        "Add your Gemini API key in .env to enable explanations."
      );
      explanationPromiseRef.current = null;
      setIsGeneratingExplanation(false);
      return;
    }

    let cancelled = false;
    setIsGeneratingExplanation(true);
    setExplanationError(null);
    const promise = fetchReportExplanation(explanationPayload)
      .then((text) => {
        if (cancelled) return text;
        setExplanationText(text);
        setExplanationError(null);
        return text;
      })
      .catch((err) => {
        if (cancelled) return "";
        const message =
          err?.message ||
          "We couldn't create an explanation. Please try again shortly.";
        setExplanationText("");
        setExplanationError(message);
        throw err;
      })
      .finally(() => {
        if (!cancelled) {
          setIsGeneratingExplanation(false);
        }
      });

    explanationPromiseRef.current = promise;

    return () => {
      cancelled = true;
    };
  }, [explanationPayload, hasResultsReady, explanationConfigReady]);
  */

  // Gemini explanation generation (current implementation)
  useEffect(() => {
    if (!hasResultsReady) {
      setExplanationText("");
      setExplanationError(null);
      explanationPromiseRef.current = null;
      setIsGeneratingExplanation(false);
      return;
    }

    if (!explanationConfigReady) {
      setExplanationText("");
      setExplanationError(
        "Add your Gemini API key in .env to enable explanations."
      );
      explanationPromiseRef.current = null;
      setIsGeneratingExplanation(false);
      return;
    }

    let cancelled = false;
    setIsGeneratingExplanation(true);
    setExplanationError(null);
    const promise = fetchReportExplanation(explanationPayload)
      .then((text) => {
        if (cancelled) return text;
        setExplanationText(text);
        setExplanationError(null);
        return text;
      })
      .catch((err) => {
        if (cancelled) return "";
        const message =
          err?.message ||
          "We couldn't create an explanation. Please try again shortly.";
        setExplanationText("");
        setExplanationError(message);
        throw err;
      })
      .finally(() => {
        if (!cancelled) {
          setIsGeneratingExplanation(false);
        }
      });

    explanationPromiseRef.current = promise;

    return () => {
      cancelled = true;
    };
  }, [explanationPayload, hasResultsReady, explanationConfigReady]);

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

  // Build preview URLs for image files only
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
    const accepts = which === "oct" ? acceptOct : acceptFundus;
    const accepted = filterByAccept(incoming, accepts);
    if (accepted.length === 0) return;
    if (which === "oct") {
      setOctFiles((p) => [...p, ...accepted]);
    } else {
      setFundusFiles((p) => [...p, ...accepted]);
    }
  }
  function handlePick(e, which) {
    const incoming = filesFromEvent(e);
    const accepts = which === "oct" ? acceptOct : acceptFundus;
    const accepted = filterByAccept(incoming, accepts);
    if (accepted.length > 0) {
      if (which === "oct") {
        setOctFiles((p) => [...p, ...accepted]);
      } else {
        setFundusFiles((p) => [...p, ...accepted]);
      }
    }
    e.target.value = null;
  }
  function removeFile(which, idx) {
    if (which === "oct") {
      setOctFiles((p) => p.filter((_, i) => i !== idx));
    } else {
      setFundusFiles((p) => p.filter((_, i) => i !== idx));
    }
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
    setCombinedResult([]);
    setServerError(null);

    try {
      logDebug("Analyze started", {
        apiBaseUrl,
        octFiles: octFiles.length,
        fundusFiles: fundusFiles.length,
      });

      // Check if we have both OCT and Fundus files for combined prediction
      const hasBothModalities = octFiles.length > 0 && fundusFiles.length > 0;

      if (hasBothModalities) {
        // Use combined endpoint - pair files
        logDebug("Using combined prediction endpoint", {
          pairs: Math.min(octFiles.length, fundusFiles.length),
        });

        const pairs = Math.min(octFiles.length, fundusFiles.length);
        const combinedResults = [];

        for (let i = 0; i < pairs; i++) {
          const combined = await requestCombinedPrediction(
            octFiles[i],
            fundusFiles[i],
            apiBaseUrl,
            logDebug
          );
          combinedResults.push({
            octFile: octFiles[i].name,
            fundusFile: fundusFiles[i].name,
            ...combined,
          });
        }

        // Handle remaining unpaired files (if any)
        const remainingOct = octFiles.slice(pairs);
        const remainingFundus = fundusFiles.slice(pairs);

        const individualResults = await Promise.all([
          ...remainingOct.map((file) =>
            requestPrediction(file, "oct", apiBaseUrl, logDebug)
          ),
          ...remainingFundus.map((file) =>
            requestPrediction(file, "fundus", apiBaseUrl, logDebug)
          ),
        ]);

        setCombinedResult(combinedResults);
        setResults(individualResults);
        logDebug("Combined predictions completed", {
          combined: combinedResults.length,
          individual: individualResults.length,
        });
      } else {
        // Use individual endpoints
        logDebug("Using individual prediction endpoints");

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
      }
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
    setCombinedResult([]);
    setResetSelected(false);
    setServerError(null);
    setExplanationText("");
    setExplanationError(null);
    setIsGeneratingExplanation(false);
    explanationPromiseRef.current = null;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(FILE_STORAGE_KEY);
    }
    logDebug("Form reset");
  }

  function buildReportHtml(explanationData = {}) {
    const now = new Date();
    const dateStr = now.toLocaleString();

    let sections = "";
    const { text, error, generating, configured } = explanationData;
    let explanationSection = "";

    if (hasResultsReady) {
      let message = "";
      if (text) {
        message = `<p style="margin:0;">${escapeHtml(text)}</p>`;
      } else if (error) {
        message = `<p style="margin:0;color:#b42318;">${escapeHtml(error)}</p>`;
      } else if (configured === false) {
        message =
          '<p style="margin:0;">Add your AI key in the .env file to unlock automatic explanations.</p>';
      } else if (generating) {
        message = '<p style="margin:0;">Generating explanation…</p>';
      } else {
        message =
          '<p style="margin:0;">No explanation is available for these predictions.</p>';
      }
      explanationSection = `<section style="margin-top:24px;border:1px solid #dbe8f0;padding:16px;border-radius:8px;background:#f6fbff;">
  <h2 style="margin:0 0 8px;font-size:18px;color:#005a72;">Result Explanation</h2>
  ${message}
</section>`;
    }

    // Add combined results
    if (combinedResult.length > 0) {
      sections += combinedResult
        .map((combined, idx) => {
          const octData = combined.patient_analysis?.oct;
          const fundusData = combined.patient_analysis?.fundus;
          const summary = combined.summary;

          return `<section style="margin-bottom:32px;border:2px solid #0066cc;padding:16px;border-radius:8px;">
  <h2 style="margin:0 0 8px;font-size:20px;color:#0066cc;">Patient Analysis ${
    idx + 1
  } (Combined OCT + Fundus)</h2>
  <div style="margin-bottom:16px;padding:12px;background:#f0f7ff;border-radius:4px;">
    <div style="font-weight:600;margin-bottom:4px;">Files Analyzed:</div>
    <div>OCT: ${combined.octFile}</div>
    <div>Fundus: ${combined.fundusFile}</div>
  </div>
  
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    <div>
      <h3 style="margin:0 0 8px;font-size:16px;">OCT Analysis</h3>
      <div style="margin-bottom:8px;"><strong>Diagnosis:</strong> ${
        octData?.predicted_class_name || "N/A"
      }</div>
      <div style="margin-bottom:8px;"><strong>Confidence:</strong> ${
        octData?.confidence ? formatPercent(octData.confidence) + "%" : "N/A"
      }</div>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead><tr><th style="text-align:left;padding:4px 8px;border:1px solid #e3e7ea;background:#f6fafb;">Condition</th><th style="text-align:right;padding:4px 8px;border:1px solid #e3e7ea;background:#f6fafb;">%</th></tr></thead>
        <tbody>${Object.entries(octData?.all_probabilities_named || {})
          .map(
            ([name, value]) =>
              `<tr><td style="padding:4px 8px;border:1px solid #e3e7ea;">${name}</td><td style="padding:4px 8px;border:1px solid #e3e7ea;text-align:right;">${formatPercent(
                value
              )}%</td></tr>`
          )
          .join("")}</tbody>
      </table>
    </div>
    
    <div>
      <h3 style="margin:0 0 8px;font-size:16px;">Fundus Analysis</h3>
      <div style="margin-bottom:8px;"><strong>Diagnosis:</strong> ${
        fundusData?.predicted_class_name || "N/A"
      }</div>
      <div style="margin-bottom:8px;"><strong>Confidence:</strong> ${
        fundusData?.confidence
          ? formatPercent(fundusData.confidence) + "%"
          : "N/A"
      }</div>
      <table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead><tr><th style="text-align:left;padding:4px 8px;border:1px solid #e3e7ea;background:#f6fafb;">Condition</th><th style="text-align:right;padding:4px 8px;border:1px solid #e3e7ea;background:#f6fafb;">%</th></tr></thead>
        <tbody>${Object.entries(fundusData?.all_probabilities_named || {})
          .map(
            ([name, value]) =>
              `<tr><td style="padding:4px 8px;border:1px solid #e3e7ea;">${name}</td><td style="padding:4px 8px;border:1px solid #e3e7ea;text-align:right;">${formatPercent(
                value
              )}%</td></tr>`
          )
          .join("")}</tbody>
      </table>
    </div>
  </div>
</section>`;
        })
        .join("");
    }

    // Add individual results
    if (results.length > 0) {
      sections += results
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
    }

    if (!sections) {
      sections = "<p>No analysis results available.</p>";
    }

    const reportBody = `${sections}${explanationSection}`;

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
    ${reportBody}
    <div class="footer">These results are created automatically by OcuFusion AI from the eye images you uploaded. They are for learning and research only and do not replace a consultation with a qualified eye specialist.</div>
  </body>
</html>`;
  }

  async function getExplanationForReport() {
    if (!hasResultsReady) return "";
    if (explanationText) {
      return explanationText;
    }
    if (!explanationConfigReady) {
      return "";
    }
    if (explanationPromiseRef.current) {
      try {
        const text = await explanationPromiseRef.current;
        return text;
      } catch (_err) {
        return "";
      }
    }
    return "";
  }

  async function viewReport() {
    if (!hasResultsReady) return;
    const explanationForReport = await getExplanationForReport();
    const html = buildReportHtml({
      text: explanationForReport,
      error: explanationError,
      generating: isGeneratingExplanation,
      configured: explanationConfigReady,
    });
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  async function downloadReport() {
    if (!hasResultsReady) return;
    const explanationForReport = await getExplanationForReport();
    const html = buildReportHtml({
      text: explanationForReport,
      error: explanationError,
      generating: isGeneratingExplanation,
      configured: explanationConfigReady,
    });
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

  // Render combined results
  function renderCombinedResults() {
    if (!combinedResult.length) return null;

    return combinedResult.map((combined, idx) => {
      const octData = combined.patient_analysis?.oct;
      const fundusData = combined.patient_analysis?.fundus;

      return (
        <article
          key={`combined-${idx}`}
          className="prediction-card"
          style={{ border: "2px solid #0066cc" }}
        >
          <div className="prediction-card-head">
            <div>
              <div className="file-name" style={{ color: "#0066cc" }}>
                Patient Analysis {idx + 1} (Combined)
              </div>
              <div className="file-sub">
                OCT: {combined.octFile} | Fundus: {combined.fundusFile}
              </div>
            </div>
          </div>

          <div
            className="prediction-summary"
            style={{ background: "#f0f7ff", marginBottom: "12px" }}
          ></div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {/* OCT Results */}
            <div>
              <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>
                OCT Analysis
              </h3>
              <div className="prediction-summary">
                <div className="summary-item">
                  <span>Diagnosis</span>
                  <strong>{octData?.predicted_class_name || "N/A"}</strong>
                </div>
                <div className="summary-item">
                  <span>Confidence</span>
                  <strong>
                    {octData?.confidence
                      ? `${formatPercent(octData.confidence)}%`
                      : "N/A"}
                  </strong>
                </div>
              </div>
              <table className="probability-table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th style={{ width: "80px" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(octData?.all_probabilities_named || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, value]) => (
                      <tr key={`oct-${name}`}>
                        <td>{name}</td>
                        <td className="probability-cell">
                          {formatPercent(value)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Fundus Results */}
            <div>
              <h3 style={{ fontSize: "16px", marginBottom: "8px" }}>
                Fundus Analysis
              </h3>
              <div className="prediction-summary">
                <div className="summary-item">
                  <span>Diagnosis</span>
                  <strong>{fundusData?.predicted_class_name || "N/A"}</strong>
                </div>
                <div className="summary-item">
                  <span>Confidence</span>
                  <strong>
                    {fundusData?.confidence
                      ? `${formatPercent(fundusData.confidence)}%`
                      : "N/A"}
                  </strong>
                </div>
              </div>
              <table className="probability-table" style={{ fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th style={{ width: "80px" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(fundusData?.all_probabilities_named || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([name, value]) => (
                      <tr key={`fundus-${name}`}>
                        <td>{name}</td>
                        <td className="probability-cell">
                          {formatPercent(value)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <details className="raw-json">
            <summary>Raw JSON response</summary>
            <pre>{JSON.stringify(combined, null, 2)}</pre>
          </details>
        </article>
      );
    });
  }

  return (
    <div className="ocf-page">
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

          {octFiles.length > 0 && fundusFiles.length > 0 && (
            <div
              style={{
                padding: "12px",
                background: "#e8f4fd",
                borderRadius: "6px",
                marginBottom: "12px",
                fontSize: "14px",
                color: "#0066cc",
              }}
            >
              ℹ️ Both OCT and Fundus images detected. They will be analyzed
              together for comprehensive diagnosis.
            </div>
          )}

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

          {!hasResultsReady && !serverError && (
            <div className="no-results">
              <div className="doc-icon" aria-hidden />
              <div className="no-results-text">
                No results yet — upload to see
              </div>
            </div>
          )}

          {hasResultsReady && (
            <div className="prediction-cards">
              {/* Render Combined Results First */}
              {renderCombinedResults()}

              {/* Render Individual Results */}
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

          {hasResultsReady && (
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

          {hasResultsReady && (
            <section className="report-explanation" aria-live="polite">
              <div className="report-explanation__heading">
                Result explanation
              </div>
              {isGeneratingExplanation && explanationConfigReady ? (
                <p className="report-explanation__note">
                  Generating a plain-language explanation for your report…
                </p>
              ) : explanationText ? (
                <p className="report-explanation__text">{explanationText}</p>
              ) : (
                <p className="report-explanation__note">
                  {explanationError ||
                    "Add your Gemini API key in .env to include explanations in the PDF report."}
                </p>
              )}
            </section>
          )}

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
                placeholder="http://0.0.0.0:5001/"
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
