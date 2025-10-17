import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "n.Solve",
  company: "ness.",
  tagline: "Vulnerability Lifecycle Manager",
  version: packageJson.version,
  copyright: `© ${currentYear} ness. All rights reserved.`,
  meta: {
    title: "n.Solve | ness. Vulnerability Lifecycle Manager",
    description:
      "Professional vulnerability lifecycle management platform. Centralize, correlate, and manage security vulnerabilities across your entire infrastructure with intelligent automation.",
  },
  brand: {
    colors: {
      primary: "#00ADE8",
      primaryHover: "#0096CC",
      background: "#0B0C0E",
      surface1: "#111317",
      surface2: "#151820",
      surface3: "#1B2030",
      text: "#EEF1F6",
      textMuted: "#9CA3AF",
    },
  },
};
