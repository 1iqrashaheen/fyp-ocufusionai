import worksimage from "../worksimage.png";

const workingContent = {
  image: worksimage,
  heading:
    "OcuFusion AI brings Fundus and OCT together for clearer, faster screening support.",
  intro:
    "Built with modern CNN and Vision Transformer backbones, OcuFusion AI runs automated analysis on paired retinal scans. Our multimodal fusion head combines complementary features from Fundus (surface & vasculature) and OCT (retinal layers) to predict disease and severity where labels exist. Explainable overlays and downloadable reports help researchers and clinicians review results with confidence. This is a research prototype (non-diagnostic).",
  features: [
    "📄 PDF report with probabilities, severity & overlays",
    "🧩 Device-agnostic design (tested on public datasets)",
    "🔒 Privacy-minded flow (no PHI stored by default)",
    "Simple flow: Upload → Analyze → View results",
  ],
  // *Adjust the privacy line above once you confirm storage/retention behavior.

  chooseUs: [
    "Reduce missed cues via multimodal fusion",
    "Get visual explanations alongside predictions",
    "Simple upload → analyze → export workflow",
    "Reproducible metrics for research (accuracy, F1, AUC)",
    "Modular codebase to plug in new backbones/datasets",
  ],
};

export default workingContent;
