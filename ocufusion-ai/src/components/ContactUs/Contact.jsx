import React, { useState } from "react";
import "./Contact.css";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const defaultForm = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  message: "",
};

const contactEmail = "iqrashaheen271@gmail.com";

const buildGmailComposeUrl = (subject, body) => {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: contactEmail,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
};

const Contact = () => {
  const [formValues, setFormValues] = useState(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = ({ target: { name, value } }) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, organization, message } = formValues;

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.warning("⚠️ Please fill in your name, email, and message.");
      return;
    }

    const subject = "Ocufusion AI Contact";
    const bodyLines = [
      "Hello Ocufusion AI team,",
      "",
      message.trim(),
      "",
      "Contact details:",
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      phone.trim() ? `Phone: ${phone.trim()}` : null,
      organization.trim() ? `Organization: ${organization.trim()}` : null,
      "",
      "Sent via website contact form.",
    ].filter(Boolean);
    const gmailUrl = buildGmailComposeUrl(subject, bodyLines.join("\n"));
    window.open(gmailUrl, "_blank", "noopener");

    const endpoint = import.meta.env.VITE_CONTACT_FUNCTION_URL;
    if (!endpoint) {
      toast.info("Opened Gmail so you can send your message directly.");
      setFormValues(defaultForm);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        throw new Error("Unable to send your message right now.");
      }

      toast.success(
        "Message queued for our team. Gmail is open for your copy."
      );
      setFormValues(defaultForm);
    } catch (error) {
      toast.error(error.message || "Unable to send your message right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoClick = () => {
    navigate("/product#demo");
  };

  return (
    <section id="contact" className="contact-section">
      <h2>Contact Us</h2>
      <p className="subtitle">Ask us any question</p>

      <div className="contact-grid">
        {/* Left: Contact Form */}
        <div className="contact-form-card">
          <form className="contact-form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={formValues.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formValues.email}
              onChange={handleChange}
              required
            />
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={formValues.phone}
              onChange={handleChange}
            />
            <input
              type="text"
              name="organization"
              placeholder="Organization"
              value={formValues.organization}
              onChange={handleChange}
            />
            <textarea
              rows="5"
              name="message"
              placeholder="Message"
              value={formValues.message}
              onChange={handleChange}
              required
            />
            <button
              type="submit"
              className="btn send-btn"
              disabled={isSubmitting}
            >
              Send Contact Form
            </button>
          </form>
        </div>

        {/* Right: Info Panels */}
        <div className="contact-info">
          <div className="info-card">
            {/* <h3>For clinics or optometrists:</h3> */}
            {/* <p>Schedule a 15-minute intro call and get a free trial.</p> */}
            <p>Click here to Try it Now.</p>
            <button className="btn info-btn">Try Now</button>
          </div>

          <div className="divider">Or</div>

          <div className="info-card">
            <p>You can see a demo video here of how to use a website.</p>
            <button
              type="button"
              className="btn info-btn"
              onClick={handleDemoClick}
            >
              Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
