import React, { useState } from "react";
import "./Contact.css";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

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

  const handleChange = ({ target: { name, value } }) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, phone, organization, message } = formValues;

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.warning("Please fill in your name, email, and message.");
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

      toast.success("Message queued for our team. Gmail is open for your copy.");
      setFormValues(defaultForm);
    } catch (error) {
      toast.error(error.message || "Unable to send your message right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="contact">
      <div className="contact__card">
        <div className="contact__copy">
          <div className="eyebrow">Contact</div>
          <h2>Questions, feedback or a clinic pilot?</h2>
          <p>Send us a note and it opens in Gmail, addressed to the team.</p>
          <a className="mono contact__email" href={`mailto:${contactEmail}`}>
            {contactEmail}
          </a>
          <div className="contact__links">
            <Link to="/analyze" className="ui-btn ui-btn--ghost">
              Try it now
            </Link>
            <Link to="/product#demo" className="ui-btn ui-btn--ghost">
              Watch the demo
            </Link>
          </div>
        </div>

        <form className="contact__form" onSubmit={handleSubmit}>
          <label className="ui-label">
            Name
            <input className="ui-input" type="text" name="name" autoComplete="name" value={formValues.name} onChange={handleChange} required />
          </label>
          <label className="ui-label">
            Email
            <input className="ui-input" type="email" name="email" autoComplete="email" value={formValues.email} onChange={handleChange} required />
          </label>
          <label className="ui-label">
            Phone (optional)
            <input className="ui-input" type="tel" name="phone" autoComplete="tel" value={formValues.phone} onChange={handleChange} />
          </label>
          <label className="ui-label">
            Organisation (optional)
            <input className="ui-input" type="text" name="organization" autoComplete="organization" value={formValues.organization} onChange={handleChange} />
          </label>
          <label className="ui-label contact__full">
            Message
            <textarea className="ui-input" rows="5" name="message" value={formValues.message} onChange={handleChange} required />
          </label>
          <div className="contact__full">
            <button type="submit" className="ui-btn ui-btn--primary" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Contact;
