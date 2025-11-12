// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Home from "./components/Home/Home";
import LoginSignup from "./components/LoginSignup/loginsignup";
import Product from "./components/Product/Product";
import About from "./components/AboutUs/About";
// import Testimonial from "./components/Testimonial/Testimonial";
import Contact from "./components/ContactUs/Contact";
import UploadAnalyzePage from "./components/UploadAnalyze/UploadAnalyzePage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product" element={<Product />} />
      <Route path="/about" element={<About />} />
      {/* <Route path="/testimonials" element={<Testimonial />} /> */}
      <Route path="/contact" element={<Contact />} />
      <Route path="/analyze" element={<UploadAnalyzePage />} />
      <Route path="/login" element={<LoginSignup />} />
    </Routes>
    <Footer />
    {/* Toast portal for surface-level notifications */}
    <ToastContainer position="top-center" newestOnTop closeOnClick />
  </>
);

export default App;
