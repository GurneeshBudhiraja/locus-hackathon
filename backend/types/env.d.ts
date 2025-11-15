declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    LOCUS_API_KEY: string;
    ANTHROPIC_API_KEY: string;
    OPENAI_API_KEY?: string;
    OPENWEATHER_API_KEY?: string;
  }
}