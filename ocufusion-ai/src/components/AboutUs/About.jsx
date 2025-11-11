import React from "react";
import aboutUsData from "../../assets/Data/Aboutusdata";
import "./About.css";

const About = () => {
  const { heading, image, description, bullets } = aboutUsData;

  return (
    <section id="about" className="about-section">
      <h2>{heading}</h2>
      <div className="about-content">
        <div className="about-image">
          <img src={image} alt={heading} />
        </div>
        <div className="about-text">
          <p>{description}</p>
          <ul>
            {bullets.map((b, idx) => (
              <li key={idx}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default About;
