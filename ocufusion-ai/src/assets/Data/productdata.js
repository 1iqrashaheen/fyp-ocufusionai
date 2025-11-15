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
    subtitle: "See how Ocufusion AI interprets scans and gave you reults",
    buttonText: "Demo",
    // backgroundImage: headerBg,
  },
  mainCard: {
    // tags: [
    //   { label: "Severity", style: "severity" },
    //   { label: "Score: 64/128", style: "score" },
    // ],
    image: mainScan,
    // label: "Confluent Drusen",
    // actions: [
    //   { text: "Add to Report", variant: "default" },
    //   { text: "Review Other Scans", variant: "primary" },
    // ],
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
      "The system first cleans and prepares your eye images, for example by making them the right size and adjusting the brightness, so they are clear and easy to read.",
      "It then looks at two types of eye scans together (a normal color eye photo (Fundus) and a deeper cross-section scan (OCT)) to better notice patterns that may be linked to common eye problems.",
      "A more experienced “teacher” version of the smart computer helps train a lighter “helper” version, so you can get results faster.",
    ],
  },
};

export default productData;
