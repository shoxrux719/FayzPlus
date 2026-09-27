create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  language text not null check (language in ('uz', 'ru', 'en')),
  branch text not null,
  source text not null,
  service text not null,
  doctor text not null default '',
  answers jsonb not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  wants_contact boolean not null default false,
  name text not null default '',
  phone text not null default ''
);

create index if not exists feedback_submitted_at_idx on public.feedback (submitted_at desc);
create index if not exists feedback_rating_idx on public.feedback (rating);
create index if not exists feedback_branch_idx on public.feedback (branch);
create index if not exists feedback_doctor_idx on public.feedback (doctor);

alter table public.feedback enable row level security;
-- No public policies: only the server-side service role can read and write feedback.
