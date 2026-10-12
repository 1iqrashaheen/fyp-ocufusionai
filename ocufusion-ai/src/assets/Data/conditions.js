// Single source of truth for the nine classes the backend predicts.
// Codes match DISEASES in backend/app.py.

import fundusNormal from "../fundus_images/Normal.png";
import fundusdAMD from "../fundus_images/dAMD.png";
import funduswAMD from "../fundus_images/wAMD.png";
import fundusDR from "../fundus_images/DR.png";
import fundusGLC from "../fundus_images/GLC.png";
import fundusCSC from "../fundus_images/CSC.png";
import fundusMEM from "../fundus_images/MEM.png";
import fundusRVO from "../fundus_images/RVO.png";

import octNormal from "../oct_images/Normal.png";
import octdAMD from "../oct_images/dAMD.png";
import octwAMD from "../oct_images/wAMD.png";
import octDR from "../oct_images/DR.png";
import octGLC from "../oct_images/GLC.png";
import octCSC from "../oct_images/CSC.png";
import octMEM from "../oct_images/MEM.png";
import octRVO from "../oct_images/RVO.png";

// urgency: "routine" | "exam" | "prompt"
const conditions = [
  {
    code: "NOR",
    short: "Normal",
    name: "Normal retina",
    fundus: fundusNormal,
    oct: octNormal,
    about:
      "A healthy retina with no signs of the conditions OcuFusion checks for. A normal result still does not replace a regular eye exam.",
    fundusSign: "Clear optic disc, evenly spread vessels, a darker central macula.",
    octSign: "Smooth, evenly layered retina with a gentle dip at the fovea.",
    meaning:
      "No signs of the nine conditions were found. Keep up regular eye checks, especially if you have diabetes or a family history of eye disease.",
    urgency: "routine",
    next: "See an optometrist at your usual interval.",
  },
  {
    code: "AMD",
    short: "Dry AMD",
    name: "Dry age-related macular degeneration",
    fundus: fundusdAMD,
    oct: octdAMD,
    about:
      "Slow thinning of the macula with age, often with yellow deposits called drusen. Central vision fades gradually.",
    fundusSign: "Yellow drusen spots around the macula.",
    octSign: "Bumps under the retina where drusen sit; thinning outer layers.",
    meaning:
      "Dry AMD is a slow thinning of the macula, the part of the retina used for detail. It usually progresses over years.",
    urgency: "exam",
    next: "An eye specialist can confirm it and suggest monitoring, such as an Amsler grid at home.",
  },
  {
    code: "WAMD",
    short: "Wet AMD",
    name: "Wet age-related macular degeneration",
    fundus: funduswAMD,
    oct: octwAMD,
    about:
      "Abnormal blood vessels grow under the macula and leak fluid or blood. It can damage central vision quickly and needs prompt care.",
    fundusSign: "Grey-green lesion, bleeding or exudate near the macula.",
    octSign: "Fluid pockets and a raised, irregular layer under the retina.",
    meaning:
      "Wet AMD means fragile new vessels are leaking under the macula. It can affect central vision quickly but is treatable.",
    urgency: "prompt",
    next: "Contact an eye specialist soon, especially if straight lines look bent or vision is dropping.",
  },
  {
    code: "DR",
    short: "Diabetic retinopathy",
    name: "Diabetic retinopathy",
    fundus: fundusDR,
    oct: octDR,
    about:
      "High blood sugar damages the small vessels of the retina. Early stages have no symptoms, which is why screening matters.",
    fundusSign: "Tiny red dots, blot haemorrhages and yellow hard exudates.",
    octSign: "Bright exudate spots and swelling within the retinal layers.",
    meaning:
      "Diabetic retinopathy is damage to the retina's small blood vessels caused by diabetes. Early stages often have no symptoms.",
    urgency: "exam",
    next: "Share this report with your eye specialist and diabetes care team.",
  },
  {
    code: "GLC",
    short: "Glaucoma",
    name: "Glaucoma",
    fundus: fundusGLC,
    oct: octGLC,
    about:
      "Damage to the optic nerve, often linked to raised eye pressure. Side vision is lost first, so it can go unnoticed for years.",
    fundusSign: "An enlarged, pale cup in the centre of the optic disc.",
    octSign: "Thinning of the nerve fibre layer around the optic nerve.",
    meaning:
      "Glaucoma damages the optic nerve and usually affects side vision first, so it can go unnoticed for a long time.",
    urgency: "exam",
    next: "A pressure test and visual field test can confirm or rule it out.",
  },
  {
    code: "CSC",
    short: "CSC",
    name: "Central serous chorioretinopathy",
    fundus: fundusCSC,
    oct: octCSC,
    about:
      "Fluid collects under the retina, usually in one eye, causing blurred or distorted central vision. Many cases settle on their own.",
    fundusSign: "A round, slightly raised area at the macula.",
    octSign: "A clear dome of fluid lifting the retina.",
    meaning:
      "Central serous chorioretinopathy is fluid under the retina. It often settles on its own within a few months.",
    urgency: "exam",
    next: "A specialist can confirm it with an OCT scan and advise on follow-up.",
  },
  {
    code: "MEM",
    short: "Epiretinal membrane",
    name: "Macular epiretinal membrane",
    fundus: fundusMEM,
    oct: octMEM,
    about:
      "A thin, scar-like film forms on the surface of the macula and can wrinkle it, making straight lines look wavy.",
    fundusSign: "A glossy sheen and fine wrinkles over the macula.",
    octSign: "A bright line on the retinal surface with a thickened, puckered macula.",
    meaning:
      "An epiretinal membrane is a thin film on the macula that can make lines look wavy. Many people only need monitoring.",
    urgency: "exam",
    next: "Mention any distortion in your vision to your eye specialist.",
  },
  {
    code: "RVO",
    short: "Vein occlusion",
    name: "Retinal vein occlusion",
    fundus: fundusRVO,
    oct: octRVO,
    about:
      "A blocked vein stops blood draining from the retina, causing bleeding and swelling. Sudden blurred vision in one eye is common.",
    fundusSign: "Flame-shaped haemorrhages along a swollen, twisted vein.",
    octSign: "Retinal thickening and cyst-like fluid spaces.",
    meaning:
      "A retinal vein occlusion is a blocked vein in the retina, which can cause bleeding and swelling.",
    urgency: "prompt",
    next: "See an eye specialist soon and check your blood pressure with your doctor.",
  },
  {
    code: "MYO",
    short: "Myopia",
    name: "Pathologic myopia",
    fundus: null,
    oct: null,
    about:
      "In severe short-sightedness the eye grows too long and stretches the retina, which raises the risk of other problems.",
    fundusSign: "A tilted optic disc with a pale crescent beside it.",
    octSign: "A thin, steeply curved retina and choroid.",
    meaning:
      "Pathologic myopia is severe short-sightedness that stretches the retina and raises the risk of other problems.",
    urgency: "exam",
    next: "Regular retinal checks are recommended with high myopia.",
  },
];

export const urgencyLabel = {
  routine: "Routine check-up",
  exam: "Book an eye exam",
  prompt: "Seek prompt care",
};

const byCode = Object.fromEntries(conditions.map((c) => [c.code, c]));
const byBackendName = {
  Normal: "NOR",
  "Age-related Macular Degeneration": "AMD",
  "Central Serous Chorioretinopathy": "CSC",
  "Diabetic Retinopathy": "DR",
  Glaucoma: "GLC",
  "Macular Edema/Membrane": "MEM",
  Myopia: "MYO",
  "Retinal Vein Occlusion": "RVO",
  "Wet AMD": "WAMD",
};

/** Look up a condition by backend code or backend display name. */
export function findCondition(codeOrName) {
  if (!codeOrName) return null;
  return byCode[codeOrName] || byCode[byBackendName[codeOrName]] || null;
}

export default conditions;
