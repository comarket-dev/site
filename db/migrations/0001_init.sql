-- Comarket site: waitlist, experiments and events.

create sequence if not exists pass_no_seq start 1;

create table if not exists waitlist (
  id           bigserial primary key,
  pass_no      integer not null default nextval('pass_no_seq') unique,
  side         text not null check (side in ('brand', 'creator')),
  email        text not null,
  label        text not null,
  site_url     text,
  handle       text,
  platform     text,
  -- The price a brand was shown. We honor it.
  price_arm    text,
  price_first  numeric(5, 2),
  price_after  numeric(5, 2),
  visitor_id   uuid,
  country      text,
  utm          jsonb,
  referrer     text,
  created_at   timestamptz not null default now(),
  unique (side, email)
);

create table if not exists assignments (
  visitor_id   uuid not null,
  experiment   text not null,
  arm          text not null,
  assigned_at  timestamptz not null default now(),
  primary key (visitor_id, experiment)
);
create index if not exists assignments_experiment_arm on assignments (experiment, arm);

create table if not exists events (
  id           bigserial primary key,
  visitor_id   uuid,
  type         text not null,
  experiment   text,
  arm          text,
  value        double precision,
  props        jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists events_type_visitor on events (type, visitor_id, created_at);
