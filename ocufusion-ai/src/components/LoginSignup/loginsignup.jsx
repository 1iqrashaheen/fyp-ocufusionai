// import React, { useState } from "react";
// import {
//   FaUser,
//   FaEnvelope,
//   FaLock,
//   FaEye,
//   FaGoogle,
//   FaFacebookF,
// } from "react-icons/fa";
// import "./LoginSignup.css";
// import loginimage from "../../assets/loginimage.png";
// import signupimage from "../../assets/signupimage.png";

// const LoginSignup = () => {
//   const [isLogin, setIsLogin] = useState(true);
//   const [showPw, setShowPw] = useState(false);

//   return (
//     <div className="ls-container">
//       {/* Single .ls-card with dynamic background */}
//       <div
//         className="ls-card"
//         // style={{
//         //   backgroundImage: `url(${isLogin ? loginimage : signupimage})`,
//         // }}
//       >
//         <div className="ls-form">
//           <div className="ls-form-headings">
//             {" "}
//             <h2>
//               {isLogin
//                 ? "Welcome Back to Ocufusion AI"
//                 : "Create Your Ocufusion AI Account"}
//             </h2>
//             <p>
//               {isLogin
//                 ? "Please login to your dashboard to continue."
//                 : "Join our AI-powered diagnostic platform."}
//             </p>
//           </div>
//           <form>
//             {!isLogin && (
//               <div className="field">
//                 <FaUser className="icon" />
//                 <input type="text" placeholder="Full Name" required />
//               </div>
//             )}
//             <div className="field">
//               <FaEnvelope className="icon" />
//               <input type="email" placeholder="Email Address" required />
//             </div>
//             <div className="field">
//               <FaLock className="icon" />
//               <input
//                 type={showPw ? "text" : "password"}
//                 placeholder="Password"
//                 required
//               />
//               <FaEye className="toggle" onClick={() => setShowPw((s) => !s)} />
//             </div>
//             {!isLogin && (
//               <div className="field">
//                 <FaLock className="icon" />
//                 <input
//                   type={showPw ? "text" : "password"}
//                   placeholder="Confirm Password"
//                   required
//                 />{" "}
//                 <FaEye
//                   className="toggle"
//                   onClick={() => setShowPw((s) => !s)}
//                 />
//               </div>
//             )}
//             {!isLogin && (
//               <label className="checkbox">
//                 <input type="checkbox" required />I agree to the{" "}
//                 <a>Terms & Privacy Policy</a>
//               </label>
//             )}
//             <button type="submit" className="btn">
//               {isLogin ? "Login" : "Sign Up"}
//             </button>
//           </form>

//           <div className="oauth">
//             <div className="divider">
//               <span>Or continue with</span>
//             </div>
//             <div className="providers">
//               <FaGoogle />
//               <FaFacebookF />
//             </div>
//           </div>

//           <p className="switch">
//             {isLogin ? "Don’t have an account? " : "Already have an account? "}
//             <span onClick={() => setIsLogin((l) => !l)}>
//               {isLogin ? "Sign up here" : "Log in here"}
//             </span>
//           </p>
//         </div>
//         <div className="ls-image-wrapper">
//           <img
//             src={isLogin ? loginimage : signupimage}
//             alt=""
//             className="ls-background-image"
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginSignup;
import React, { useState } from "react";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaEye,
  FaGoogle,
  FaFacebookF,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
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
import "./LoginSignup.css";
import loginimage from "../../assets/loginimage.png";
import signupimage from "../../assets/signupimage.png";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");

const LoginSignup = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [authPending, setAuthPending] = useState(false);
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const navigate = useNavigate();

  const { fullName, email, password, confirmPassword } = formValues;

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
        const providers = await fetchSignInMethodsForEmail(
          auth,
          attemptedEmail,
        );
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
        "Password must include letters, numbers, and at least one special character.",
      );
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      toast.warning("Passwords do not match.");
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
          password,
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

  const onOAuthClick = async (providerKey) => {
    const provider =
      providerKey === "google" ? googleProvider : facebookProvider;

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

  const onToggleAuthMode = () => {
    setIsLogin((prev) => !prev);
    resetForm();
  };

  return (
    <div className="ls-container">
      {/* Single .ls-card with dynamic background */}
      <div
        className="ls-card"
        // style={{
        //   backgroundImage: `url(${isLogin ? loginimage : signupimage})`,
        // }}
      >
        <div className="ls-form">
          <div className="ls-form-headings">
            {" "}
            <h2>
              {isLogin
                ? "Welcome Back to Ocufusion AI"
                : "Create Your Ocufusion AI Account"}
            </h2>
            <p>
              {isLogin
                ? "Please login to your dashboard to continue."
                : "Join our AI-powered diagnostic platform."}
            </p>
          </div>

          {/* onSubmit added */}
          <form onSubmit={onSubmit}>
            {!isLogin && (
              <div className="field">
                <FaUser className="icon" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}
            <div className="field">
              <FaEnvelope className="icon" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="field">
              <FaLock className="icon" />
              <input
                type={showPw ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={password}
                onChange={handleInputChange}
                required
              />
              <FaEye className="toggle" onClick={() => setShowPw((s) => !s)} />
            </div>
            {!isLogin && (
              <div className="field">
                <FaLock className="icon" />
                <input
                  type={showPw ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={handleInputChange}
                  required
                />
                <FaEye
                  className="toggle"
                  onClick={() => setShowPw((s) => !s)}
                />
              </div>
            )}
            {!isLogin && (
              <label className="checkbox">
                <input type="checkbox" required />I agree to the{" "}
                <a>Terms & Privacy Policy</a>
              </label>
            )}
            <button type="submit" className="btn" disabled={authPending}>
              {isLogin ? "Login" : "Sign Up"}
            </button>
          </form>

          <div className="oauth">
            <div className="divider">
              <span>Or continue with</span>
            </div>
            <div className="providers">
              <FaGoogle
                onClick={() => onOAuthClick("google")}
                style={{ cursor: "pointer" }}
              />
              <FaFacebookF
                onClick={() => onOAuthClick("facebook")}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>

          <p className="switch">
            {isLogin ? "Don’t have an account? " : "Already have an account? "}
            <span onClick={onToggleAuthMode}>
              {isLogin ? "Sign up here" : "Log in here"}
            </span>
          </p>
        </div>
        <div className="ls-image-wrapper">
          <img
            src={isLogin ? loginimage : signupimage}
            alt=""
            className="ls-background-image"
          />
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
