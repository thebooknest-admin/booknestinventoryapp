-- Phase 1: Value Intelligence Foundation
-- Safe, additive migration for The Book Nest inventory system
-- Target table model: valuation at book_titles level, duplicate logic at book_copies level

begin;

-- =====================================================
-- 1) book_titles valuation columns
-- =====================================================
alter table public.book_titles
  add column if not exists estimated_market_value numeric(10,2),
  add column if not exists value_source text,
  add column if not exists value_last_checked_at timestamptz,
  add column if not exists high_value_flag boolean not null default false,
  add column if not exists premium_flag boolean not null default false,
  add column if not exists resale_candidate boolean not null default false,
  add column if not exists disposition_recommendation text,
  add column if not exists value_band text,
  add column if not exists stale_value_flag boolean not null default false;

-- Guardrails for controlled enums
alter table public.book_titles
  drop constraint if exists book_titles_value_source_chk;

alter table public.book_titles
  add constraint book_titles_value_source_chk
  check (
    value_source is null
    or value_source in ('manual','api','comps')
  );

alter table public.book_titles
  drop constraint if exists book_titles_disposition_recommendation_chk;

alter table public.book_titles
  add constraint book_titles_disposition_recommendation_chk
  check (
    disposition_recommendation is null
    or disposition_recommendation in ('keep_subscription','review','resale_candidate','resale_priority')
  );

alter table public.book_titles
  drop constraint if exists book_titles_value_band_chk;

alter table public.book_titles
  add constraint book_titles_value_band_chk
  check (
    value_band is null
    or value_band in ('normal','watch','resale_watch','high','premium')
  );

-- Helpful indexes for dashboard filters
create index if not exists idx_book_titles_estimated_market_value
  on public.book_titles (estimated_market_value);

create index if not exists idx_book_titles_value_band
  on public.book_titles (value_band);

create index if not exists idx_book_titles_disposition_recommendation
  on public.book_titles (disposition_recommendation);

create index if not exists idx_book_titles_stale_value_flag
  on public.book_titles (stale_value_flag);

create index if not exists idx_book_titles_premium_flag
  on public.book_titles (premium_flag);

create index if not exists idx_book_titles_high_value_flag
  on public.book_titles (high_value_flag);

-- =====================================================
-- 2) valuation settings (single active settings row)
-- =====================================================
create table if not exists public.valuation_settings (
  id uuid primary key default gen_random_uuid(),
  high_value_threshold numeric(10,2) not null default 25.00,
  premium_threshold numeric(10,2) not null default 50.00,
  stale_days integer not null default 30,
  duplicate_high_threshold integer not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valuation_settings_thresholds_chk
    check (high_value_threshold >= 0 and premium_threshold >= high_value_threshold),
  constraint valuation_settings_stale_days_chk
    check (stale_days >= 1),
  constraint valuation_settings_duplicate_high_threshold_chk
    check (duplicate_high_threshold >= 1)
);

-- Ensure only one active row
create unique index if not exists uq_valuation_settings_one_active
  on public.valuation_settings ((active))
  where active = true;

-- Seed default active row if none exists
insert into public.valuation_settings (
  high_value_threshold,
  premium_threshold,
  stale_days,
  duplicate_high_threshold,
  active
)
select 25.00, 50.00, 30, 3, true
where not exists (
  select 1 from public.valuation_settings where active = true
);

-- =====================================================
-- 3) per-bin minimum floor guardrail config
-- =====================================================
create table if not exists public.bin_floor_config (
  id uuid primary key default gen_random_uuid(),
  bin_code text not null,
  min_bin_floor integer not null default 1,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bin_floor_config_floor_chk check (min_bin_floor >= 0)
);

-- One active config row per bin
create unique index if not exists uq_bin_floor_config_active_bin
  on public.bin_floor_config (bin_code)
  where active = true;

create index if not exists idx_bin_floor_config_bin_code
  on public.bin_floor_config (bin_code);

-- Seed defaults from active bins if missing (default floor = 1)
insert into public.bin_floor_config (bin_code, min_bin_floor, active)
select b.bin_code, 1, true
from public.bins b
where b.is_active = true
  and not exists (
    select 1
    from public.bin_floor_config f
    where f.bin_code = b.bin_code
      and f.active = true
  );

-- =====================================================
-- 4) valuation history audit table
-- =====================================================
create table if not exists public.book_value_history (
  id uuid primary key default gen_random_uuid(),
  book_title_id uuid not null references public.book_titles(id) on delete cascade,
  estimated_market_value numeric(10,2),
  value_source text,
  captured_at timestamptz not null default now(),
  note text,
  constraint book_value_history_value_source_chk
    check (
      value_source is null
      or value_source in ('manual','api','comps')
    )
);

create index if not exists idx_book_value_history_book_title_id
  on public.book_value_history (book_title_id);

create index if not exists idx_book_value_history_captured_at
  on public.book_value_history (captured_at desc);

commit;
