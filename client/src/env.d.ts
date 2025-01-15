/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}; 