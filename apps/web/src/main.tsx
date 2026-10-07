import "./shared/styles/fonts.css";
import "./shared/styles/tokens.css";
import "./shared/styles/global.css";

function takeVerificationToken(): string {
  const value = window.__examVerifyToken;
  delete window.__examVerifyToken;
  if (value === undefined || value === "") return "";
  if (value === "invalid") return "invalid";
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : "invalid";
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root");
const verifyToken = takeVerificationToken();

if (import.meta.env.VITE_DATA_MODE === "demo") {
  void import("./demo/mount").then((mod) => mod.mountDemo(root, verifyToken));
} else {
  void import("./live/mount").then((mod) => mod.mountLive(root, verifyToken));
}
