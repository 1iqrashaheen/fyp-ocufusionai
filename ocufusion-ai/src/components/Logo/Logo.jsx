import React from "react";

// Three concentric rings, redrawn from logo.png as a crisp vector.
const Logo = ({ size = 28, color = "var(--accent)", stroke = 2.4 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="16" cy="16" r="14" stroke={color} strokeWidth={stroke} />
    <circle cx="16" cy="16" r="9.5" stroke={color} strokeWidth={stroke} />
    <circle cx="16" cy="16" r="5" stroke={color} strokeWidth={stroke} />
  </svg>
);

export const Wordmark = () => (
  <span className="wordmark">
    OcuFusion<span style={{ color: "var(--accent)" }}> AI</span>
  </span>
);

export default Logo;
