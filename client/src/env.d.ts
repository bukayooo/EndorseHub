
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
