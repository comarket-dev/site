/// <reference types="astro/client" />

interface Hyperdrive {
  connectionString: string;
}

declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    EXPERIMENTS?: KVNamespace;
    HYPERDRIVE?: Hyperdrive;
    DATABASE_URL?: string;
    PRICING_MODE?: string;
    PUBLIC_TURNSTILE_SITE_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  }
}

declare namespace App {
  interface Locals {
    /** Present only when this visitor may be tracked (consent given, or not required). */
    visitorId?: string;
    /** True when we must ask before setting tracking cookies. */
    needsConsent: boolean;
    country?: string;
    /** Experiment id to arm id, for experiments that apply to this route. */
    arms: Record<string, string>;
  }
}
