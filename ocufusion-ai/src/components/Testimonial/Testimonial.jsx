import React from "react";
import { FaLinkedin } from "react-icons/fa";
import testimonialData from "../../assets/Data/testimonial";
import "./Testimonial.css";

const Testimonial = () => {
  const { heading, items } = testimonialData;

  return (
    <section id="testimonials" className="testimonials-section">
      <h2>{heading}</h2>
      <div className="testimonials-grid">
        {items.map((t, idx) => (
          <div className="testimonial-card" key={idx}>
            <img src={t.avatar} alt={t.name} className="avatar" />
            <h3>{t.name}</h3>
            <span className="title">{t.title}</span>
            <p>“{t.quote}”</p>
            {/* <a
              href={t.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-icon"
            >
              <FaLinkedin size={20} />
            </a> */}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonial;
