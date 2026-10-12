// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Home from "./components/Home/Home";
import LoginSignup from "./components/LoginSignup/loginsignup";
import Product from "./components/Product/Product";
import About from "./components/AboutUs/About";
import Contact from "./components/ContactUs/Contact";
import UploadAnalyzePage from "./components/UploadAnalyze/UploadAnalyzePage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Sign-in is a full-screen page with its own brand mark; the analyze
// workspace is an app screen, so neither shows the marketing footer.
const NO_NAVBAR = ["/login"];
const NO_FOOTER = ["/login", "/analyze"];

const App = () => {
  const { pathname } = useLocation();
  return (
    <>
      {!NO_NAVBAR.includes(pathname) && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<Product />} />
        <Route path="/library" element={<Product />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/analyze" element={<UploadAnalyzePage />} />
        <Route path="/login" element={<LoginSignup />} />
      </Routes>
      {!NO_FOOTER.includes(pathname) && <Footer />}
      {/* Toast portal for surface-level notifications */}
      <ToastContainer
        position="top-center"
        newestOnTop
        closeOnClick
        theme="dark"
      />
    </>
  );
};

export default App;
