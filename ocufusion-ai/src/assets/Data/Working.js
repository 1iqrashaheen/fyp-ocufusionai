// Copy for the "How it works" and "Behind the scenes" sections on Home.
// Facts here come from backend/README.md (MultiEYE / OCT-CoDA).

const workingContent = {
  steps: [
    {
      icon: "upload",
      title: "Upload your images",
      text: "Drop in a fundus photo, an OCT scan, or both. PNG or JPG, up to 32 MB per request. Several pairs can be queued at once.",
    },
    {
      icon: "read",
      title: "Two models read them",
      text: "A fundus model and an OCT model each score all nine conditions. For a pair, OcuFusion checks whether both land on the same answer.",
    },
    {
      icon: "report",
      title: "Get a clear report",
      text: "See the most likely condition, every score, and what it means in plain words. Save it as a PDF to share with your eye specialist.",
    },
  ],

  behindIntro:
    "OcuFusion builds on MultiEYE and its OCT-assisted Conceptual Distillation (OCT-CoDA). A model trained on OCT scans learns disease concepts from the retina's layers, then passes that knowledge to a lighter fundus model, so even a fundus photo on its own benefits from what OCT can see.",

  behind: [
    {
      title: "Clean the image",
      text: "Fundus photos get contrast-limited histogram equalisation; OCT scans get a median filter. Both are resized and padded so nothing is distorted.",
    },
    {
      title: "Match against disease concepts",
      text: "Each image is compared with a library of described symptoms for every condition, which keeps predictions tied to visible signs.",
    },
    {
      title: "Teacher to student",
      text: "The OCT teacher distils its knowledge into the fundus student, trained on data assembled from 12 public fundus and 4 OCT datasets.",
    },
  ],
};

export default workingContent;
