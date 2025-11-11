// src/components/Product/Product.jsx
import React from "react";
import "./Product.css";
import productData from "../../assets/Data/productdata";

const Product = () => {
  const { header, mainCard, thumbnails, behind } = productData;

  return (
    <div className="product-page">
      {/* Header */}
      <header className="product-header">
        <h1 className="product-header__title">{header.title}</h1>
        <p className="product-header__subtitle">{header.subtitle}</p>
        <button className="product-header__demo-btn btn">
          {header.buttonText}
        </button>
      </header>

      {/* Combined Demo Section */}
      <section className="product-demo">
        {/* Main Scan Card */}
        <div className="product-main-card">
          <div className="product-main-card__tags">
            {mainCard.tags.map((tag, i) => (
              <span key={i} className={`product-tag product-tag--${tag.style}`}>
                {tag.label}
              </span>
            ))}
          </div>
          <img
            src={mainCard.image}
            alt={mainCard.label}
            className="product-main-card__image"
          />
          <span className="product-main-card__label">{mainCard.label}</span>
          <div className="product-main-card__actions">
            {mainCard.actions.map((action, i) => (
              <button
                key={i}
                className={`btn product-action-btn ${
                  action.variant === "primary"
                    ? "product-action-btn--primary"
                    : ""
                }`}
              >
                {action.text}
              </button>
            ))}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="product-thumbs">
          {thumbnails.map((t, i) => (
            <div className="product-thumb" key={i}>
              <img src={t.src} alt={t.label} className="product-thumb__image" />
              <p className="product-thumb__label">{t.label}</p>
            </div>
          ))}
        </div>
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
