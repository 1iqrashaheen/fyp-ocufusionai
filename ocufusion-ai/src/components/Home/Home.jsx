import React, { useEffect } from "react";
import "./Home.css";
import Contact from "../ContactUs/Contact";

import headerbackground from "../../assets/headerbackground.png";
// import worksimage from "../../assets/worksimage.png";
import workingContent from "../../assets/Data/Working";
import Testimonial from "../Testimonial/Testimonial";
import AboutUs from "../AboutUs/About";
import { useNavigate, useLocation } from "react-router-dom";
// import LoginSignup from "../LoginSignup/loginsignup";

const Home = () => {
  const navigate = useNavigate();
  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleDemoClick = () => {
    navigate("/product");
  };
  const location = useLocation();

  // Smooth scroll to in-page anchors when hash changes
  useEffect(() => {
    const hash = (location.hash || "").replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      // Defer to ensure element is in DOM
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }, [location]);
  return (
    <>
      <div className="home-container">
        {/* Header Section with Background Image */}
        <section
          id="home"
          className="hero-section"
          style={{ backgroundImage: `url(${headerbackground})` }}
        >
          <div className="overlay">
            <div className="hero-content">
              <div className="diagnostic-badge">
                ✅ 24/7 Diagnostic Assistance Available
              </div>
              <h1>AI for Medical Imaging</h1>
              <p>
                Automated Decision Support for <br />
                Accurate & Fast OCT Scan Analysis
              </p>
              <div className="hero-buttons">
                {/* <button className="btn primary">Book Free Trial</button> */}
                <button onClick={handleLoginClick} className="btn primary">
                  Book Free Trial
                </button>
                <button onClick={handleDemoClick} className="btn secondary">
                  See Demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how" className="how-section">
          <h2>How It Works?</h2>
          <div className="how-content">
            <div className="oct-image">
              <img src={workingContent.image} alt="OCT Scan" />
            </div>
            <div className="how-text">
              <h3>{workingContent.heading}</h3>
              <p>{workingContent.intro}</p>
              <ul>
                {workingContent.features.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
              {/* <h3>Why choose Us</h3>
              <ul>
                {workingContent.chooseUs.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul> */}
            </div>
          </div>
        </section>
      </div>
      <Contact />
      <Testimonial />
      <AboutUs />
    </>
  );
};

export default Home;
