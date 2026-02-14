-- Batch Label Printing Workflow
-- Target table: public.book_copies (1 row per physical label/SKU)

begin;

-- 1) Label queue columns
alter table public.book_copies
  add column if not exists label_status text not null default 'pending',
  add column if not exists label_printed_at timestamptz,
  add column if not exists label_batch_id text;

alter table public.book_copies
  drop constraint if exists book_copies_label_status_chk;

alter table public.book_copies
  add constraint book_copies_label_status_chk
  check (label_status in ('pending', 'printed'));

create index if not exists idx_book_copies_label_status
  on public.book_copies(label_status);

create index if not exists idx_book_copies_label_batch_id
  on public.book_copies(label_batch_id);

-- 2) Ensure SKU uniqueness (fail fast if duplicates exist)
do $$
begin
  if exists (
    select 1
    from public.book_copies
    group by sku
    having count(*) > 1
  ) then
    raise exception 'Duplicate SKU values exist in book_copies. Fix duplicates before applying unique constraint.';
  end if;
end $$;

create unique index if not exists uq_book_copies_sku
  on public.book_copies(sku);

-- 3) Reserve next batch (FOR UPDATE SKIP LOCKED)
drop function if exists public.create_label_batch(int);
create or replace function public.create_label_batch(limit_count int default 20)
returns table (
  id uuid,
  title text,
  isbn text,
  sku text,
  bin_code text,
  qr_value text,
  batch_id text
)
language plpgsql
as $$
declare
  v_limit int := greatest(1, least(coalesce(limit_count, 20), 200));
  v_batch_id text;
  v_existing_batch_id text;
begin
  -- Prevent overlapping active batches (pending rows already reserved)
  select bc.label_batch_id
  into v_existing_batch_id
  from public.book_copies bc
  where bc.label_batch_id is not null
    and bc.label_status = 'pending'
  limit 1;

  if v_existing_batch_id is not null then
    -- Return existing batch rows instead of creating a new one
    return query
    select
      bc.id,
      bt.title,
      bc.isbn,
      bc.sku,
      coalesce(bc.bin_id, '') as bin_code,
      bc.sku as qr_value,
      bc.label_batch_id as batch_id
    from public.book_copies bc
    left join public.book_titles bt on bt.id = bc.book_title_id
    where bc.label_batch_id = v_existing_batch_id
      and bc.label_status = 'pending'
    order by bc.created_at asc;

    return;
  end if;

  v_batch_id := 'LBL-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  with locked as (
    select bc.ctid
    from public.book_copies bc
    where bc.label_status = 'pending'
      and bc.label_batch_id is null
    order by bc.created_at asc
    limit v_limit
    for update skip locked
  )
  update public.book_copies bc
  set label_batch_id = v_batch_id
  from locked l
  where bc.ctid = l.ctid;

  -- Return full set from this batch
  return query
  select
    bc.id,
    bt.title,
    bc.isbn,
    bc.sku,
    coalesce(bc.bin_id, '') as bin_code,
    bc.sku as qr_value,
    bc.label_batch_id as batch_id
  from public.book_copies bc
  left join public.book_titles bt on bt.id = bc.book_title_id
  where bc.label_batch_id = v_batch_id
    and bc.label_status = 'pending'
  order by bt.title asc, bc.sku asc;
end;
$$;

-- 4) Mark batch as printed
create or replace function public.mark_label_batch_printed(p_batch_id text)
returns int
language plpgsql
as $$
declare
  v_updated int := 0;
begin
  update public.book_copies
  set label_status = 'printed',
      label_printed_at = now()
  where label_batch_id = p_batch_id
    and label_status = 'pending';

  get diagnostics v_updated = row_count;

  return v_updated;
end;
$$;

-- 5) Release (unreserve) a batch that wasn't printed
create or replace function public.release_label_batch(p_batch_id text)
returns int
language plpgsql
as $$
declare
  v_updated int := 0;
begin
  update public.book_copies
  set label_batch_id = null
  where label_batch_id = p_batch_id
    and label_status = 'pending';

  get diagnostics v_updated = row_count;

  return v_updated;
end;
$$;

-- 6) Helper to fetch currently active pending batch
drop function if exists public.get_active_label_batch();
create or replace function public.get_active_label_batch()
returns table (
  id uuid,
  title text,
  isbn text,
  sku text,
  bin_code text,
  qr_value text,
  batch_id text
)
language sql
as $$
  with active as (
    select label_batch_id as batch_id
    from public.book_copies
    where label_batch_id is not null
      and label_status = 'pending'
    order by created_at asc
    limit 1
  )
  select
    bc.id,
    bt.title,
    bc.isbn,
    bc.sku,
    coalesce(bc.bin_id, '') as bin_code,
    bc.sku as qr_value,
    bc.label_batch_id as batch_id
  from public.book_copies bc
  left join public.book_titles bt on bt.id = bc.book_title_id
  join active a on a.batch_id = bc.label_batch_id
  where bc.label_status = 'pending'
  order by bt.title asc, bc.sku asc;
$$;

commit;
