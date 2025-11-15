// src/assets/Data/productdata.js
// import headerBg from "../decision-header-bg.png";
import iconBars from "../workflow-bars.png";
import iconTree from "../workflow-trees.png";
import demoVideoSrc from "../Demo.mov?url";

// Fundus references
import fundusNormal from "../fundus_images/Normal.png";
import fundusdAMD from "../fundus_images/dAMD.png";
import fundusCSC from "../fundus_images/CSC.png";
import fundusDR from "../fundus_images/DR.png";
import fundusGLC from "../fundus_images/GLC.png";
import fundusMEM from "../fundus_images/MEM.png";
import fundusRVO from "../fundus_images/RVO.png";
import funduswAMD from "../fundus_images/wAMD.png";

// OCT references
import octNormal from "../oct_images/Normal.png";
import octdAMD from "../oct_images/dAMD.png";
import octCSC from "../oct_images/CSC.png";
import octDR from "../oct_images/DR.png";
import octMEM from "../oct_images/MEM.png";
import octRVO from "../oct_images/RVO.png";
import octwAMD from "../oct_images/wAMD.png";

const eyeConditions = [
  { short: "Normal", full: "Normal" },
  { short: "dAMD", full: "Dry Age-Related Macular Degeneration" },
  { short: "CSC", full: "Central Serous Chorioretinopathy" },
  { short: "DR", full: "Diabetic Retinopathy" },
  { short: "GLC", full: "Glaucoma" },
  { short: "MEM", full: "Macular Epiretinal Membrane" },
  { short: "RVO", full: "Retinal Vein Occlusion" },
  { short: "wAMD", full: "Wet Age-Related Macular Degeneration" },
];

const fundusAssets = {
  Normal: fundusNormal,
  dAMD: fundusdAMD,
  CSC: fundusCSC,
  DR: fundusDR,
  GLC: fundusGLC,
  MEM: fundusMEM,
  RVO: fundusRVO,
  wAMD: funduswAMD,
};

const octAssets = {
  Normal: octNormal,
  dAMD: octdAMD,
  CSC: octCSC,
  DR: octDR,
  MEM: octMEM,
  RVO: octRVO,
  wAMD: octwAMD,
};

const formatLabel = (condition) =>
  condition.short === condition.full
    ? condition.full
    : `${condition.full} (${condition.short})`;

const buildGallery = (assets) =>
  eyeConditions
    .map((condition) => {
      const src = assets[condition.short];
      if (!src) return null;
      return {
        short: condition.short,
        label: formatLabel(condition),
        src,
      };
    })
    .filter(Boolean);

const fundusGallery = buildGallery(fundusAssets);
const octGallery = buildGallery(octAssets);

const productData = {
  header: {
    title: "AI Decision Support for OCT",
    subtitle: "See how Ocufusion AI interprets scans and gave you reults",
    buttonText: "Demo",
    // backgroundImage: headerBg,
  },
  mainCard: {
    demoVideo: {
      title: "Demo video preview",
      src: demoVideoSrc,
      type: "video/quicktime",
    },
  },
  galleries: {
    intro:
      "Review the reference gallery to see how the model tells apart each eye problem using both normal eye photos (fundus) and inside-eye slice scans (OCT).",
    fundus: {
      heading: "Fundus reference set",
      description:
        "Colored photos of the back of the eye that show blood vessels and overall eye health and uses for quick screening.",
      items: fundusGallery,
    },
    oct: {
      heading: "OCT reference set",
      description:
        "Cross-section eye scans that help the AI see swelling, layers, and shapes inside the eye.",
      items: octGallery,
    },
  },
  behind: {
    heading: "How It Works Behind the Scenes",
    icons: [iconBars, iconTree],
    items: [
      "The system first cleans and prepares your eye images, for example by making them the right size and adjusting the brightness, so they are clear and easy to read.",
      "It then looks at two types of eye scans together (a normal color eye photo (Fundus) and a deeper cross-section scan (OCT)) to better notice patterns that may be linked to common eye problems.",
      "A more experienced “teacher” version of the smart computer helps train a lighter “helper” version, so you can get results faster.",
    ],
  },
};

export default productData;
