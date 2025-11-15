-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.contractors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  github_login character varying NOT NULL,
  person_name character varying NOT NULL,
  repo_name character varying NOT NULL,
  repo_owner character varying NOT NULL,
  wallet_address character varying NOT NULL,
  role character varying NOT NULL,
  track_prs boolean DEFAULT false,
  total_amount_payable numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contractors_pkey PRIMARY KEY (id)
);