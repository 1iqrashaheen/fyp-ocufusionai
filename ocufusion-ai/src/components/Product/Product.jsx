// src/components/Product/Product.jsx
import React, { useEffect, useRef } from "react";
import "./Product.css";
import productData from "../../assets/Data/productdata";
import { useLocation } from "react-router-dom";

const Product = () => {
  const { header, mainCard, galleries, behind } = productData;
  const videoRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const handleDemoClick = () => {
    if (!videoRef.current) return;
    try {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {
          /* Autoplay protections intentionally ignored */
        });
      }
      videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      console.error("Unable to start demo video", error);
    }
  };

  useEffect(() => {
    if (location.hash === "#demo") {
      handleDemoClick();
    }
  }, [location.hash]);

  return (
    <div className="product-page">
      {/* Header */}
      <header className="product-header">
        <h1 className="product-header__title">{header.title}</h1>
        <p className="product-header__subtitle">{header.subtitle}</p>
        <button
          className="product-header__demo-btn btn"
          onClick={handleDemoClick}
        >
          {header.buttonText}
        </button>
      </header>

      {/* Combined Demo Section */}
      <section className="product-demo" id="demo">
        {/* Main Scan Card */}
        <div className="product-main-card">
          <div className="product-main-card__tags">
            {/* {mainCard.tags.map((tag, i) => (
              <span key={i} className={`product-tag product-tag--${tag.style}`}>
                {tag.label}
              </span>
            ))} */}
          </div>
          <div className="product-video">
            <div className="product-video__frame">
              <video
                ref={videoRef}
                className="product-video__player"
                src={mainCard.demoVideo.src}
                preload="metadata"
                controls
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(event) => event.preventDefault()}
                playsInline
              >
                <track kind="captions" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Reference Galleries */}
      <section className="product-galleries">
        <p className="product-gallery__intro">{galleries.intro}</p>
        {[galleries.fundus, galleries.oct].map((gallery, idx) => (
          <div className="product-gallery" key={`${gallery.heading}-${idx}`}>
            <div className="product-gallery__header">
              <h3 className="product-gallery__heading">{gallery.heading}</h3>
              <p className="product-gallery__description">
                {gallery.description}
              </p>
            </div>
            <div className="product-thumbs">
              {gallery.items.map((item) => (
                <div className="product-thumb" key={item.short}>
                  <img
                    src={item.src}
                    alt={item.label}
                    className="product-thumb__image"
                  />
                  <p className="product-thumb__label">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Behind the Scenes */}
      <section className="product-behind">
        <h2 className="product-behind__heading">{behind.heading}</h2>
        <div className="product-behind__content">
          <div className="product-behind__icons">
            {behind.icons.map((src, i) => (
              <img key={i} src={src} alt="" className="product-behind__icon" />
            ))}
          </div>
          <ul className="product-behind__list">
            {behind.items.map((item, i) => (
              <li key={i} className="product-behind__item">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Product;
