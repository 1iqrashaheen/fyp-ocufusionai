import React, { useState, useEffect } from "react";
import "./Navbar.css";
import logo from "../../assets/logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { auth } from "../firebase";
// import UploadAnalyzePage from "../UploadAnalyze/UploadAnalyzePage";

const Navbar = () => {
  const [sticky, setSticky] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const handleScroll = () => setSticky(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleInPageNav(e, id) {
    // If already on home page, smooth scroll and prevent navigation
    if (location.pathname === "/") {
      e.preventDefault();
      scrollToId(id);
      setMenuOpen(false);
    } else {
      // Navigate to home with hash so Home can scroll on mount
      e.preventDefault();
      setMenuOpen(false);
      navigate(`/#${id}`);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      toast.error("Unable to logout right now. Please try again.");
    }
  };
  return (
    <nav className={`navbar ${sticky ? "sticky" : ""}`}>
      <div className="logo-section">
        <img src={logo} alt="Ocupfusion AI Logo" className="logo" />
        {/* <span className="brand-name">Ocufusion AI</span> */}
        <span className="brand-name">
          <Link to="/">Ocufusion AI</Link>
        </span>
      </div>
      {/* Desktop navigation */}
      <ul className="nav-links">
        {/* <li>Home</li>
        <li>Product</li>
        <li>About Us</li>
        <li>Testimonials</li>
        <li>Contact</li> */}

        <li>
          <Link to="/#home" onClick={(e) => handleInPageNav(e, "home")}>
            Home
          </Link>
        </li>

        <li>
          <Link to="/#about" onClick={(e) => handleInPageNav(e, "about")}>
            About Us
          </Link>
        </li>
        {/* 
        <li>
          <Link
            to="/#testimonials"
            onClick={(e) => handleInPageNav(e, "testimonials")}
          >
            Testimonials
          </Link>
        </li> */}

        <li>
          <Link to="/#contact" onClick={(e) => handleInPageNav(e, "contact")}>
            Contact
          </Link>
        </li>
        <li>
          <Link to="/product">Product</Link>
        </li>
        <Link to={currentUser ? "/analyze" : "/login"} className="analyze-btn">
          ProcessImages
        </Link>
      </ul>
      <div className="nav-actions">
        {/* <span className="search-icon">🔍</span> */}
        {/* <button className="trial-btn">Free Trial</button> */}
        {currentUser ? (
          <button type="button" className="trial-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link to={currentUser ? "/analyze" : "/login"} className="trial-btn">
            Try Now
          </Link>
        )}
        {/* Hamburger for tablet/mobile */}
        <button
          className={`menu-toggle ${menuOpen ? "open" : ""}`}
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>

      {/* Dropdown panel for tablet/mobile */}
      <div className={`menu-panel ${menuOpen ? "open" : ""}`}>
        <Link to="/#home" onClick={(e) => handleInPageNav(e, "home")}>
          Home
        </Link>

        <Link to="/#about" onClick={(e) => handleInPageNav(e, "about")}>
          About Us
        </Link>
        {/* <Link
          to="/#testimonials"
          onClick={(e) => handleInPageNav(e, "testimonials")}
        >
          Testimonials
        </Link> */}
        <Link to="/#contact" onClick={(e) => handleInPageNav(e, "contact")}>
          Contact
        </Link>
        <Link to="/product" onClick={closeMenu}>
          Product
        </Link>
        <Link to={currentUser ? "/analyze" : "/login"} onClick={closeMenu}>
          ProcessImages
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
