// src/assets/Data/productdata.js
// The demo video is optional: Demo.mp4 is not committed to git, so pick it
// up only when it exists locally instead of breaking the build.
const videoModules = import.meta.glob("../Demo.mp4", {
  eager: true,
  query: "?url",
  import: "default",
});
const demoVideoSrc = Object.values(videoModules)[0] || null;

const productData = {
  header: {
    eyebrow: "Reference library",
    title: "How each condition looks",
    subtitle:
      "Reference images the models learned from. Fundus photos show the back of the eye in colour, good for quick screening. OCT scans show a cross-section, revealing swelling and the shape of each layer.",
  },
  demoVideo: {
    title: "Watch a two-minute walkthrough",
    text: "See an upload, a paired read and the report from start to finish.",
    src: demoVideoSrc,
  },
  footnote:
    "Images are reference examples from public research datasets, shown for learning. They are not from any user.",
};

export default productData;
