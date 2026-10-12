import React, { useState, useEffect } from "react";
import "./Navbar.css";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { auth } from "../firebase";
import Logo, { Wordmark } from "../Logo/Logo";

// In-page sections on the home route
const SECTIONS = [
  { id: "how", label: "How it works" },
  { id: "conditions", label: "Conditions" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 4);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Close the mobile menu on every route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  function handleInPageNav(e, id) {
    e.preventDefault();
    setMenuOpen(false);
    if (location.pathname === "/") {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Navigate to home with hash so Home can scroll on mount
      navigate(`/#${id}`);
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      setMenuOpen(false);
      navigate("/");
    } catch {
      toast.error("Unable to logout right now. Please try again.");
    }
  };

  const analyzeTarget = currentUser ? "/analyze" : "/login";

  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="nav__inner">
        <Link to="/" className="nav__brand" aria-label="OcuFusion AI home">
          <Logo size={30} />
          <Wordmark />
        </Link>

        <nav className="nav__links" aria-label="Main">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`/#${s.id}`}
              className="nav__link"
              onClick={(e) => handleInPageNav(e, s.id)}
            >
              {s.label}
            </a>
          ))}
          <NavLink to="/product" className="nav__link">
            Reference library
          </NavLink>
        </nav>

        <div className="nav__actions">
          {currentUser ? (
            <button type="button" className="nav__link nav__plain" onClick={handleLogout}>
              Sign out
            </button>
          ) : (
            <Link to="/login" className="nav__link">
              Sign in
            </Link>
          )}
          <Link to={analyzeTarget} className="ui-btn ui-btn--primary nav__cta">
            {location.pathname === "/analyze" ? "Analyze" : "Start analysis"}
          </Link>
          <button
            type="button"
            className={`nav__toggle ${menuOpen ? "is-open" : ""}`}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="nav-panel"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Dropdown panel for tablet/mobile */}
      <div id="nav-panel" className={`nav__panel ${menuOpen ? "is-open" : ""}`}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`/#${s.id}`} onClick={(e) => handleInPageNav(e, s.id)}>
            {s.label}
          </a>
        ))}
        <Link to="/product">Reference library</Link>
        <Link to={analyzeTarget}>Analyze images</Link>
        {currentUser ? (
          <button type="button" onClick={handleLogout}>
            Sign out
          </button>
        ) : (
          <Link to="/login">Sign in</Link>
        )}
      </div>
    </header>
  );
};

export default Navbar;
