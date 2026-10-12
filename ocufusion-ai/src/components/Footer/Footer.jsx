import React from "react";
import { Link } from "react-router-dom";
import Logo from "../Logo/Logo";
import { SOURCE_URL } from "../../project";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Logo size={22} stroke={2.6} />
          <span>
            &copy; {new Date().getFullYear()} OcuFusion AI · Final Year Project
          </span>
        </div>
        <nav aria-label="Footer" className="footer__links">
          <Link to="/#how">How it works</Link>
          <Link to="/product">Reference library</Link>
          <Link to="/analyze">Analyze</Link>
          <Link to="/#contact">Contact</Link>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">GitHub source ↗</a>
        </nav>
      </div>
      <p className="footer__note">
        Research prototype for learning and awareness. Not a medical device and
        not a substitute for an eye examination.
      </p>
    </footer>
  );
};

export default Footer;
