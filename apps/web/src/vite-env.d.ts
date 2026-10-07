/// <reference types="vite/client" />

interface Window {
  __examVerifyToken?: string;
}

interface ImportMetaEnv {
  readonly VITE_DATA_MODE: "demo" | "live";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
