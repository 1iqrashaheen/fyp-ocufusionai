import worksimage from "../worksimage.png";

const workingContent = {
  image: worksimage,
  heading:
    "OcuFusion AI uses two types of eye scans together to help with clearer and faster eye checks.",

  intro:
    "OcuFusion AI is a smart student project that helps with early eye screening. It looks at two kinds of eye images at the same time: a normal color photo of the back of your eye (Fundus) and a special side-view scan (OCT) that shows the layers inside your eye. By studying both images together, the system can highlight areas that might not look normal and may need a doctor to review them. The goal is to support eye specialists by saving time and helping them notice important signs more easily. You can also download simple reports that show the results in a clear way. This is a research prototype only (non-diagnostic) and it does not replace a real eye checkup with a doctor.",

  features: [
    "Easy-to-read PDF report with result summaries.",
    "Can work with eye images from different clinics and hospitals.",
    "Designed with privacy in mind: by default, we do not store personal details like your name, ID, or contact information.",
    "Simple step-by-step use: Upload your eye images → Let the system analyze them → View and download your results.",
  ],
  // *Adjust the privacy line above once you confirm storage/retention behavior.

  chooseUs: [
    "Helps reduce missed signs by looking at two types of eye scans together instead of just one.",
    "Gives visual highlights on the images so you and your doctor can easily see which parts of the eye may need more attention.",
    "Very simple flow: just upload the files, wait for the analysis, then view and export the report if you want to save or share it.",
    "Provides clear scores and numbers so researchers can compare performance over time and improve the system further.",
    "Built in separate, flexible parts so future developers can add new eye scan types, new models, or new datasets without starting from zero.",
  ],
};

export default workingContent;
