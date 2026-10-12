import React, { useState } from "react";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import Logo, { Wordmark } from "../Logo/Logo";
import { findCondition } from "../../assets/Data/conditions";
import "./loginsignup.css";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");

const artCase = findCondition("WAMD");

const LoginSignup = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();

  const { fullName, email, password, confirmPassword } = formValues;

  // Live password rules, mirrored from the validation in onSubmit
  const rules = [
    ["At least 6 characters", password.length >= 6],
    ["A letter", /[A-Za-z]/.test(password)],
    ["A number", /\d/.test(password)],
    ["A special character", /[^A-Za-z0-9]/.test(password)],
    ["Passwords match", password.length > 0 && password === confirmPassword],
  ];

  const handleInputChange = ({ target: { name, value } }) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormValues({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setShowPw(false);
    setAgreed(false);
  };

  const validateEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleAuthErrors = (error) => {
    switch (error.code) {
      case "auth/email-already-in-use":
        toast.warning("Email already in use. Try a different email.");
        break;
      case "auth/invalid-email":
        toast.warning("Please enter a valid email address.");
        break;
      case "auth/weak-password":
        toast.warning("Password must be at least 6 characters long.");
        break;
      case "auth/user-not-found":
        toast.warning("Account not found. Please sign up first.");
        break;
      case "auth/invalid-credential":
      case "auth/wrong-password":
        toast.warning("Incorrect email or password.");
        break;
      case "auth/account-exists-with-different-credential":
        toast.warning("Email already in use. Try a different email.");
        break;
      case "auth/too-many-requests":
        toast.warning("Too many attempts. Please try again later.");
        break;
      default:
        toast.error("Something went wrong. Please try again.");
    }
  };

  const handleLoginFailure = async (error, attemptedEmail) => {
    if (error.code === "auth/user-not-found") {
      toast.warning("Account not found. Please sign up first.");
      return;
    }
    if (error.code === "auth/invalid-credential") {
      try {
        const providers = await fetchSignInMethodsForEmail(auth, attemptedEmail);
        if (!providers.length) {
          toast.warning("Account not found. Please sign up first.");
        } else {
          toast.warning("Incorrect email or password.");
        }
      } catch {
        toast.warning("Incorrect email or password.");
      }
      return;
    }
    handleAuthErrors(error);
  };

  // Centralized redirect so we only change the path in one place
  const goToAnalyze = () => navigate("/analyze");

  // Submit handler wires up validation + Firebase Auth
  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!isLogin && !fullName.trim()) {
      toast.warning("Please enter your name.");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      toast.warning("Please enter a valid email address.");
      return;
    }
    if (typeof password !== "string" || password.trim().length === 0) {
      toast.warning("Please enter a valid string password.");
      return;
    }
    if (password.length < 6) {
      toast.warning("Password must be at least 6 characters long.");
      return;
    }
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!(hasLetter && hasNumber && hasSpecial)) {
      toast.warning(
        "Password must include letters, numbers, and at least one special character."
      );
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      toast.warning("Passwords do not match.");
      return;
    }
    if (!isLogin && !agreed) {
      toast.warning("Please accept the terms to create an account.");
      return;
    }

    setAuthPending(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        toast.success("Login successful!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          password
        );
        // Store the display name if provided so it can be used elsewhere
        if (fullName.trim()) {
          await updateProfile(userCredential.user, {
            displayName: fullName.trim(),
          });
        }
        toast.success("Account created successfully!");
      }
      resetForm();
      goToAnalyze();
    } catch (error) {
      if (
        isLogin &&
        (error.code === "auth/invalid-credential" ||
          error.code === "auth/user-not-found")
      ) {
        await handleLoginFailure(error, trimmedEmail);
      } else {
        handleAuthErrors(error);
      }
    } finally {
      setAuthPending(false);
    }
  };

  // Kept for when Google / Facebook sign-in is switched back on
  // eslint-disable-next-line no-unused-vars
  const onOAuthClick = async (providerKey) => {
    const provider = providerKey === "google" ? googleProvider : facebookProvider;

    setAuthPending(true);
    try {
      await signInWithPopup(auth, provider);
      toast.success("Login successful!");
      resetForm();
      goToAnalyze();
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") {
        toast.info("Sign-in popup closed before completion.");
      } else if (error.code === "auth/cancelled-popup-request") {
        toast.info("Sign-in cancelled. Please try again.");
      } else {
        handleAuthErrors(error);
      }
    } finally {
      setAuthPending(false);
    }
  };

  const switchMode = (login) => {
    setIsLogin(login);
    resetForm();
  };

  const pwToggle = (
    <button
      type="button"
      className="ls-field__toggle"
      onClick={() => setShowPw((s) => !s)}
      aria-label={showPw ? "Hide password" : "Show password"}
    >
      {showPw ? <FaEyeSlash /> : <FaEye />}
    </button>
  );

  return (
    <div className="ls">
      <main className="ls__main">
        <Link to="/" className="ls__brand" aria-label="OcuFusion AI home">
          <Logo size={28} />
          <Wordmark />
        </Link>

        <div className="ls__center">
          <div className="ls__form-wrap">
            <div className="ls__tabs" role="tablist" aria-label="Account">
              <button type="button" role="tab" aria-selected={isLogin} onClick={() => switchMode(true)}>
                Sign in
              </button>
              <button type="button" role="tab" aria-selected={!isLogin} onClick={() => switchMode(false)}>
                Create account
              </button>
            </div>

            <div className="ls__headings">
              <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
              <p>
                {isLogin
                  ? "Sign in to continue to your analyses."
                  : "Join OcuFusion AI to analyze retinal images and save your reports."}
              </p>
            </div>

            <form onSubmit={onSubmit} noValidate className="ls__form">
              {!isLogin && (
                <label className="ui-label">
                  Full name
                  <span className="ls-field">
                    <FaUser className="ls-field__icon" aria-hidden="true" />
                    <input type="text" name="fullName" autoComplete="name" value={fullName} onChange={handleInputChange} required />
                  </span>
                </label>
              )}
              <label className="ui-label">
                Email
                <span className="ls-field">
                  <FaEnvelope className="ls-field__icon" aria-hidden="true" />
                  <input type="email" name="email" autoComplete="email" value={email} onChange={handleInputChange} required />
                </span>
              </label>
              <label className="ui-label">
                Password
                <span className="ls-field">
                  <FaLock className="ls-field__icon" aria-hidden="true" />
                  <input
                    type={showPw ? "text" : "password"}
                    name="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={password}
                    onChange={handleInputChange}
                    required
                  />
                  {pwToggle}
                </span>
              </label>
              {!isLogin && (
                <>
                  <label className="ui-label">
                    Confirm password
                    <span className="ls-field">
                      <FaLock className="ls-field__icon" aria-hidden="true" />
                      <input
                        type={showPw ? "text" : "password"}
                        name="confirmPassword"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                    </span>
                  </label>
                  <ul className="ls__rules" aria-label="Password requirements">
                    {rules.map(([label, ok]) => (
                      <li key={label} className={ok ? "is-ok" : ""}>
                        <span className="ls__rule-mark" aria-hidden="true" />
                        {label}
                        <span className="sr-only">{ok ? " (done)" : " (not yet)"}</span>
                      </li>
                    ))}
                  </ul>
                  <label className="ls__check">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                    <span>
                      I understand OcuFusion AI is a research prototype and agree to the Terms &amp; Privacy Policy.
                    </span>
                  </label>
                </>
              )}
              <button type="submit" className="ui-btn ui-btn--primary ls__submit" disabled={authPending}>
                {authPending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="ls__switch">
              {isLogin ? "New to OcuFusion AI?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => switchMode(!isLogin)}>
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
        <p className="ls__foot">Research prototype. Not a medical device.</p>
      </main>

      <aside className="ls__art" aria-hidden="true">
        <span className="ls__ring ls__ring--lg" />
        <span className="ls__ring ls__ring--md" />
        <div className="ls__art-inner">
          <div className="ls__art-images">
            <img src={artCase.fundus} alt="" />
            <img src={artCase.oct} alt="" />
          </div>
          <div className="ls__art-title">
            The fundus shows the surface. OCT shows what is underneath.
          </div>
          <div className="ls__art-text">
            Sign in to read both together and keep your reports in one place.
          </div>
        </div>
      </aside>
    </div>
  );
};

export default LoginSignup;
