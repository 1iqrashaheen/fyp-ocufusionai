import React from "react";
import { Link } from "react-router-dom";
import { FaTwitter, FaLinkedin, FaFacebook } from "react-icons/fa";
import logo from "../../assets/logo.png";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        {/* About & Logo */}
        <div className="footer-section about">
          <div className="footer-logo-section">
            <img src={logo} alt="Ocufusion AI" className="footer-logo" />
            <h1>OcufusionAI</h1>
          </div>
          <p>
            Automated Decision Support for Accurate &amp; Fast OCT Scan
            Analysis.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-section links">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/#how-it-works">How It Works</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
            <li>
              <Link to="/demo">Demo</Link>
            </li>
            <li>
              <Link to="/free-trial">Try now</Link>
            </li>
          </ul>
        </div>

        {/* Social */}
        <div className="footer-section social">
          <h4>Follow Us</h4>
          <div className="social-links">
            <a
              href="https://twitter.com/yourhandle"
              aria-label="Twitter"
              target="_blank"
              rel="noopener"
            >
              <FaTwitter size={24} />
            </a>
            <a
              href="https://linkedin.com/company/yourcompany"
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener"
            >
              <FaLinkedin size={24} />
            </a>
            <a
              href="https://facebook.com/yourpage"
              aria-label="Facebook"
              target="_blank"
              rel="noopener"
            >
              <FaFacebook size={24} />
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} Ocufusion AI. All Rights Reserved.
      </div>
    </footer>
  );
};

export default Footer;
