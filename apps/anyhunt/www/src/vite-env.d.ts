/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 地址，例如 https://server.anyhunt.app */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
