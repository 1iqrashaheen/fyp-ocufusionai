// src/components/Product/Product.jsx
// Reference library: every condition the models predict, with fundus and
// OCT examples, plus the optional demo video.
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Product.css";
import productData from "../../assets/Data/productdata";
import conditions from "../../assets/Data/conditions";

const MODES = [
  { key: "both", label: "Both" },
  { key: "fundus", label: "Fundus" },
  { key: "oct", label: "OCT" },
];

const Product = () => {
  const { header, demoVideo, footnote } = productData;
  const [mode, setMode] = useState("both");
  const videoRef = useRef(null);
  const demoRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#demo" && demoRef.current) {
      demoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play()?.catch(() => {
          /* Autoplay protections intentionally ignored */
        });
      }
    } else {
      window.scrollTo({ top: 0, left: 0 });
    }
  }, [location.hash]);

  const showFundus = mode !== "oct";
  const showOct = mode !== "fundus";

  return (
    <main className="lib">
      <div className="lib__head">
        <div className="lib__intro">
          <div className="eyebrow">{header.eyebrow}</div>
          <h1>{header.title}</h1>
          <p>{header.subtitle}</p>
        </div>
        <div className="lib__toggle" role="group" aria-label="Show images">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={mode === m.key}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lib__grid">
        {conditions.map((c) => (
          <article key={c.code} className="lib-card">
            {c.fundus ? (
              <div className={`lib-card__images ${mode === "both" ? "is-pair" : ""}`}>
                {showFundus && (
                  <figure>
                    <img src={c.fundus} alt={`Fundus reference: ${c.name}`} loading="lazy" />
                    <figcaption>FUNDUS</figcaption>
                  </figure>
                )}
                {showOct && (
                  <figure>
                    <img src={c.oct} alt={`OCT reference: ${c.name}`} loading="lazy" />
                    <figcaption>OCT</figcaption>
                  </figure>
                )}
              </div>
            ) : (
              <div className="lib-card__empty">Reference images coming soon</div>
            )}
            <div className="lib-card__body">
              <div className="lib-card__title">
                <h2>{c.name}</h2>
                <span className="mono">{c.code}</span>
              </div>
              <p>{c.about}</p>
            </div>
          </article>
        ))}
      </div>

      <section id="demo" ref={demoRef} className="lib-demo">
        <div className="lib-demo__copy">
          <div className="eyebrow">Demo</div>
          <h2>{demoVideo.title}</h2>
          <p>{demoVideo.text}</p>
          <Link to="/analyze" className="ui-btn ui-btn--primary">
            Try it yourself
          </Link>
        </div>
        <div className="lib-demo__frame">
          {demoVideo.src ? (
            <video
              ref={videoRef}
              src={demoVideo.src}
              preload="metadata"
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              onContextMenu={(event) => event.preventDefault()}
              playsInline
            >
              <track kind="captions" />
            </video>
          ) : (
            <div className="lib-demo__missing">
              Add <span className="mono">src/assets/Demo.mp4</span> to show the demo video here.
            </div>
          )}
        </div>
      </section>

      <p className="lib__footnote">{footnote}</p>
    </main>
  );
};

export default Product;
