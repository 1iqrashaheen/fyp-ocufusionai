// src/assets/productdata.js
// import headerBg from "../decision-header-bg.png";
import mainScan from "../productmainscan.png";
import thumb1 from "../productimage1.png";
import thumb2 from "../productimage2.png";
import thumb3 from "../productimage3.png";
import iconBars from "../workflow-bars.png";
import iconTree from "../workflow-trees.png";

const productData = {
  header: {
    title: "AI Decision Support for OCT",
    subtitle: "See how Ocufusion AI interprets scans with unmatched precision.",
    buttonText: "Demo",
    // backgroundImage: headerBg,
  },
  mainCard: {
    tags: [
      { label: "Severity", style: "severity" },
      { label: "Score: 64/128", style: "score" },
    ],
    image: mainScan,
    // label: "Confluent Drusen",
    actions: [
      { text: "Add to Report", variant: "default" },
      { text: "Review Other Scans", variant: "primary" },
    ],
  },
  thumbnails: [
    { src: thumb1, label: "Diabetic Macular Edema" },
    { src: thumb2, label: "Glaucoma Risk" },
    { src: thumb3, label: "Subretinal Fluid" },
  ],
  behind: {
    heading: "How It Works Behind the Scenes",
    icons: [iconBars, iconTree],
    items: [
      "Preprocessing (resize/normalize)",
      "Two-modality training (OCT + fundus)",
      "Teacher → student distillation",
    ],
  },
};

export default productData;
