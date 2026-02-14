-- Phase 2: Valuation + Recommendation Engine
-- Adds deterministic value-band + recommendation functions with dry-run support

begin;

-- =====================================================
-- Helper: value band
-- =====================================================
create or replace function public.compute_value_band(p_value numeric)
returns text
language plpgsql
as $$
begin
  if p_value is null then
    return null;
  elsif p_value < 12 then
    return 'normal';
  elsif p_value < 20 then
    return 'watch';
  elsif p_value < 30 then
    return 'resale_watch';
  elsif p_value < 50 then
    return 'high';
  else
    return 'premium';
  end if;
end;
$$;

-- =====================================================
-- Helper: base disposition (before duplicate/bin-floor adjustments)
-- =====================================================
create or replace function public.compute_base_disposition(p_value numeric)
returns text
language plpgsql
as $$
begin
  if p_value is null then
    return 'review';
  elsif p_value < 20 then
    return 'keep_subscription';
  elsif p_value < 30 then
    return 'review';
  elsif p_value < 50 then
    return 'resale_candidate';
  else
    return 'resale_priority';
  end if;
end;
$$;

-- =====================================================
-- Recompute one title (dry-run aware)
-- =====================================================
create or replace function public.recompute_book_valuation(
  p_book_title_id uuid,
  p_dry_run boolean default false
)
returns jsonb
language plpgsql
as $$
declare
  v_title public.book_titles%rowtype;
  v_settings public.valuation_settings%rowtype;
  v_value numeric;
  v_value_band text;
  v_base_disp text;
  v_final_disp text;
  v_duplicate_count integer := 0;
  v_stale boolean := false;
  v_high boolean := false;
  v_premium boolean := false;

  -- Bin floor check context
  v_primary_bin text;
  v_primary_bin_count integer := 0;
  v_primary_bin_floor integer := 0;
  v_bin_floor_ok boolean := true;

  -- for JSON output
  v_before jsonb;
  v_after jsonb;
begin
  select * into v_title
  from public.book_titles
  where id = p_book_title_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'book_title not found',
      'book_title_id', p_book_title_id
    );
  end if;

  select * into v_settings
  from public.valuation_settings
  where active = true
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', 'no active valuation_settings row'
    );
  end if;

  v_value := v_title.estimated_market_value;
  v_value_band := public.compute_value_band(v_value);
  v_base_disp := public.compute_base_disposition(v_value);
  v_final_disp := v_base_disp;

  -- duplicate count only for copies available to operate on
  select count(*)::int into v_duplicate_count
  from public.book_copies bc
  where bc.book_title_id = p_book_title_id
    and bc.status in ('in_house', 'returned');

  -- primary bin (where most available copies sit)
  select bc.bin_id, count(*)::int as c
  into v_primary_bin, v_primary_bin_count
  from public.book_copies bc
  where bc.book_title_id = p_book_title_id
    and bc.status in ('in_house', 'returned')
    and bc.bin_id is not null
  group by bc.bin_id
  order by c desc, bc.bin_id asc
  limit 1;

  if v_primary_bin is not null then
    select coalesce(f.min_bin_floor, 0)
    into v_primary_bin_floor
    from public.bin_floor_config f
    where f.bin_code = v_primary_bin
      and f.active = true
    limit 1;

    v_bin_floor_ok := (v_primary_bin_count - 1) >= coalesce(v_primary_bin_floor, 0);
  end if;

  -- flags
  v_high := (v_value is not null and v_value >= v_settings.high_value_threshold);
  v_premium := (v_value is not null and v_value >= v_settings.premium_threshold);

  v_stale := (
    v_title.value_last_checked_at is null
    or v_title.value_last_checked_at < now() - make_interval(days => v_settings.stale_days)
  );

  -- duplicate boost (only when value >= high threshold)
  if (v_value is not null and v_value >= v_settings.high_value_threshold and v_duplicate_count > 1) then
    if v_final_disp = 'keep_subscription' then
      v_final_disp := 'review';
    elsif v_final_disp = 'review' then
      v_final_disp := 'resale_candidate';
    elsif v_final_disp = 'resale_candidate' then
      if v_value >= v_settings.premium_threshold or v_duplicate_count >= v_settings.duplicate_high_threshold then
        v_final_disp := 'resale_priority';
      end if;
    end if;
  end if;

  -- bin-floor protection guardrail
  if not v_bin_floor_ok then
    if v_final_disp in ('resale_candidate', 'resale_priority') then
      v_final_disp := 'review';
    end if;
  end if;

  v_before := jsonb_build_object(
    'value_band', v_title.value_band,
    'high_value_flag', v_title.high_value_flag,
    'premium_flag', v_title.premium_flag,
    'stale_value_flag', v_title.stale_value_flag,
    'resale_candidate', v_title.resale_candidate,
    'disposition_recommendation', v_title.disposition_recommendation
  );

  v_after := jsonb_build_object(
    'value_band', v_value_band,
    'high_value_flag', v_high,
    'premium_flag', v_premium,
    'stale_value_flag', v_stale,
    'resale_candidate', v_final_disp in ('resale_candidate','resale_priority'),
    'disposition_recommendation', v_final_disp,
    'duplicate_count', v_duplicate_count,
    'primary_bin', v_primary_bin,
    'primary_bin_count', v_primary_bin_count,
    'primary_bin_floor', v_primary_bin_floor,
    'bin_floor_ok', v_bin_floor_ok
  );

  if not p_dry_run then
    update public.book_titles
    set value_band = v_value_band,
        high_value_flag = v_high,
        premium_flag = v_premium,
        stale_value_flag = v_stale,
        resale_candidate = (v_final_disp in ('resale_candidate','resale_priority')),
        disposition_recommendation = v_final_disp,
        value_last_checked_at = coalesce(value_last_checked_at, now()),
        updated_at = now()
    where id = p_book_title_id;

    insert into public.book_value_history (
      book_title_id,
      estimated_market_value,
      value_source,
      captured_at,
      note
    )
    values (
      p_book_title_id,
      v_value,
      v_title.value_source,
      now(),
      'recompute_book_valuation'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'dry_run', p_dry_run,
    'book_title_id', p_book_title_id,
    'before', v_before,
    'after', v_after
  );
end;
$$;

-- =====================================================
-- Recompute all titles (dry-run aware)
-- =====================================================
create or replace function public.recompute_all_valuations(
  p_dry_run boolean default true
)
returns table (
  book_title_id uuid,
  dry_run boolean,
  changed boolean,
  before jsonb,
  after jsonb
)
language plpgsql
as $$
declare
  r record;
  v_result jsonb;
  v_before jsonb;
  v_after jsonb;
begin
  for r in
    select bt.id
    from public.book_titles bt
  loop
    v_result := public.recompute_book_valuation(r.id, p_dry_run);
    v_before := v_result->'before';
    v_after := v_result->'after';

    book_title_id := r.id;
    dry_run := p_dry_run;
    changed := (v_before is distinct from v_after);
    before := v_before;
    after := v_after;
    return next;
  end loop;

  return;
end;
$$;

commit;
