import React, { useEffect, useState } from "react";
import "./Home.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import Contact from "../ContactUs/Contact";
import AboutUs from "../AboutUs/About";
import conditions from "../../assets/Data/conditions";
import workingContent from "../../assets/Data/Working";

const heroCase = conditions.find((c) => c.code === "DR");

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const iconProps = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--accent)",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};
const STEP_ICONS = {
  upload: (
    <svg {...iconProps}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  ),
  read: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  report: (
    <svg {...iconProps}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M10 13h6M10 17h6" />
    </svg>
  ),
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selected, setSelected] = useState("DR");
  const current = conditions.find((c) => c.code === selected);

  // Signed-in users go straight to the workspace; everyone else signs in first
  const goAnalyze = () => navigate(auth.currentUser ? "/analyze" : "/login");

  // Smooth scroll to in-page anchors when hash changes
  useEffect(() => {
    const hash = (location.hash || "").replace("#", "");
    if (!hash) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => clearTimeout(timer);
  }, [location]);

  return (
    <main className="home">
      {/* HERO */}
      <section id="home" className="home-hero">
        <div className="home-hero__copy">
          <div className="home-pill">
            <span className="home-pill__dot" />
            Research prototype · Fundus + OCT · 9 conditions
          </div>
          <h1 className="home-hero__title">
            Two views of the retina.
            <br />
            <span>One clearer read.</span>
          </h1>
          <p className="home-hero__lead">
            OcuFusion AI reads a colour fundus photo and a cross-section OCT
            scan side by side, scores nine retinal conditions, and tells you
            when the two views agree. Results come with a plain-language summary
            and a report you can take to an eye specialist.
          </p>
          <div className="home-hero__ctas">
            <button type="button" className="ui-btn ui-btn--primary home-btn-lg" onClick={goAnalyze}>
              Analyze a scan <ArrowIcon />
            </button>
            <Link to="/product" className="ui-btn ui-btn--ghost home-btn-lg">
              See the demo
            </Link>
          </div>
          <p className="home-hero__note">
            Not a medical device. For learning and awareness; it does not
            replace an eye examination.
          </p>
        </div>

        <div className="home-hero__visual">
          <div className="home-case">
            <div className="home-case__head">
              <span className="mono">SAMPLE CASE · PAIRED READ</span>
              <span className="home-case__agree">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5 9-10" />
                </svg>
                Models agree
              </span>
            </div>
            <div className="home-case__images">
              <figure>
                <img src={heroCase.fundus} alt="Fundus photograph showing diabetic retinopathy" />
                <figcaption>FUNDUS</figcaption>
              </figure>
              <figure>
                <img src={heroCase.oct} alt="OCT cross-section showing diabetic retinopathy" />
                <figcaption>OCT</figcaption>
              </figure>
            </div>
            <div className="home-case__result">
              <div className="home-case__row">
                <div>
                  <div className="home-case__label">Most likely condition</div>
                  <div className="home-case__name">Diabetic Retinopathy</div>
                </div>
                <span className="mono home-case__hint">illustrative scores</span>
              </div>
              <div className="home-bar">
                <span>Fundus</span>
                <span className="home-bar__track"><span style={{ width: "84%" }} /></span>
                <span className="mono">84%</span>
              </div>
              <div className="home-bar home-bar--oct">
                <span>OCT</span>
                <span className="home-bar__track"><span style={{ width: "91%" }} /></span>
                <span className="mono">91%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONDITION STRIP */}
      <section className="home-strip" aria-label="Conditions screened">
        <div className="home-strip__inner">
          <span className="mono home-strip__label">SCREENS FOR</span>
          {conditions.map((c) => (
            <span key={c.code}>{c.short === "CSC" ? "Central Serous Chorioretinopathy" : c.short}</span>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="home-section">
        <div className="home-section__head">
          <div>
            <div className="eyebrow">How it works</div>
            <h2 className="home-h2">Upload, read, report. Three steps, no setup.</h2>
          </div>
          <p>
            Use one image or both. When you give it a fundus photo and an OCT
            scan from the same eye, they are read as a pair and compared.
          </p>
        </div>
        <div className="home-steps">
          {workingContent.steps.map((step, i) => (
            <article key={step.title} className="home-step">
              <div className="home-step__top">
                {STEP_ICONS[step.icon]}
                <span className="mono">0{i + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* BEHIND THE SCENES */}
      <section className="home-section">
        <div className="home-behind">
          <div className="home-behind__copy">
            <div className="eyebrow">Behind the scenes</div>
            <h2 className="home-h2 home-h2--sm">An OCT teacher makes the fundus model sharper.</h2>
            <p>{workingContent.behindIntro}</p>
          </div>
          <ol className="home-behind__list">
            {workingContent.behind.map((item, i) => (
              <li key={item.title}>
                <span className="mono">{String.fromCharCode(65 + i)}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CONDITION EXPLORER */}
      <section id="conditions" className="home-section">
        <div className="home-section__intro">
          <div className="eyebrow">What it looks for</div>
          <h2 className="home-h2">Nine conditions, seen two ways.</h2>
          <p>Pick a condition to compare how it shows up on a fundus photo and on an OCT scan.</p>
        </div>
        <div className="home-chips" role="group" aria-label="Choose a condition">
          {conditions.map((c) => (
            <button
              key={c.code}
              type="button"
              className="ui-chip"
              aria-pressed={c.code === selected}
              onClick={() => setSelected(c.code)}
            >
              {c.short}
            </button>
          ))}
        </div>
        <div className="home-explorer">
          <div className="home-explorer__images">
            {[
              ["fundus", "FUNDUS PHOTO"],
              ["oct", "OCT CROSS-SECTION"],
            ].map(([key, label]) => (
              <figure key={key}>
                {current[key] ? (
                  <img src={current[key]} alt={`${label.toLowerCase()} reference: ${current.name}`} />
                ) : (
                  <div className="home-explorer__empty">No reference image in the library yet</div>
                )}
                <figcaption className="mono">{label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="home-explorer__text">
            <div className="mono home-explorer__code">{current.code}</div>
            <h3>{current.name}</h3>
            <p>{current.about}</p>
            <div className="home-explorer__signs">
              <div>
                <span>On fundus</span>
                {current.fundusSign}
              </div>
              <div>
                <span>On OCT</span>
                {current.octSign}
              </div>
            </div>
            <Link to="/product">Open the full reference library</Link>
          </div>
        </div>
      </section>

      <AboutUs />
      <Contact />
    </main>
  );
};

export default Home;
