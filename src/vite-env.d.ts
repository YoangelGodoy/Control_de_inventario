/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // añade aquí otras variables si las tienes...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}