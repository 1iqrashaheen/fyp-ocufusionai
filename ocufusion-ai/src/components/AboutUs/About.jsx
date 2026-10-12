import React from "react";
import aboutUsData from "../../assets/Data/Aboutusdata";
import "./About.css";

const About = () => {
  const { heading, description, cards } = aboutUsData;

  return (
    <section id="about" className="about">
      <div className="about__copy">
        <div className="eyebrow">About</div>
        <h2>{heading}</h2>
        <p>{description}</p>
      </div>
      <div className="about__cards">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`about__card ${card.tone === "warn" ? "about__card--warn" : ""}`}
          >
            <strong>{card.title}</strong>
            <p>{card.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default About;
