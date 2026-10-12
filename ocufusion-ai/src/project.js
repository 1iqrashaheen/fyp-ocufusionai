export const SOURCE_URL = "https://github.com/1iqrashaheen/fyp-ocufusionai";

// A production build without a hosted backend presents the project as a preview.
// Set VITE_API_BASE_URL and rebuild when the model service is ready.
export const ANALYSIS_UNAVAILABLE =
  import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL?.trim();
