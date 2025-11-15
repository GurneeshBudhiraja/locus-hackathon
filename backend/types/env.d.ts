declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    LOCUS_API_KEY: string;
    ANTHROPIC_API_KEY: string;
    OPENAI_API_KEY: string;
    SUPABASE_DEPLOYEMENT_ID?: string;
    GITHUB_DEPLOYEMENT_ID?: string;
    METORIAL_API_KEY?: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
  }
}