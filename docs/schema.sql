-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'agent'::text])),
  created_at timestamp without time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  company text,
  owner_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contact_id uuid,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'New Lead'::text CHECK (stage = ANY (ARRAY['New Lead'::text, 'Contacted'::text, 'Qualified'::text, 'Proposal Sent'::text, 'Negotiation'::text, 'Closed Won'::text, 'Closed Lost'::text])),
  owner_id uuid,
  closed_reason text,
  last_contacted_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id),
  CONSTRAINT leads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  agent_id uuid,
  activity_type text NOT NULL CHECK (activity_type = ANY (ARRAY['Call'::text, 'Email'::text, 'Meeting'::text, 'Note'::text])),
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT activities_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id)
);
CREATE TABLE public.scorecards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  manager_id uuid,
  period text NOT NULL,
  agent_score integer,
  agent_comments text,
  manager_score integer,
  manager_comments text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT scorecards_pkey PRIMARY KEY (id),
  CONSTRAINT scorecards_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id),
  CONSTRAINT scorecards_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id)
);