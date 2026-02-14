begin;

-- Optional but recommended: track label queue state on copies
alter table public.book_copies
  add column if not exists label_status text not null default 'pending',
  add column if not exists label_printed_at timestamptz,
  add column if not exists label_batch_id text;

alter table public.book_copies
  drop constraint if exists book_copies_label_status_chk;

alter table public.book_copies
  add constraint book_copies_label_status_chk
  check (label_status in ('pending', 'printed'));

create unique index if not exists uq_book_copies_sku
  on public.book_copies(sku);

-- Lock-safe SKU generator (per age code)
create or replace function public.next_book_copy_sku(p_age_code text)
returns text
language plpgsql
as $$
declare
  v_age text := upper(trim(coalesce(p_age_code, 'FLED')));
  v_max int := 0;
  v_next int;
  v_sku text;
begin
  if v_age not in ('HATCH', 'FLED', 'SOAR', 'SKY') then
    v_age := 'FLED';
  end if;

  -- One lock per age tier, lock held for transaction lifetime
  perform pg_advisory_xact_lock(hashtext('book_copy_sku_' || v_age));

  select coalesce(max((regexp_match(sku, '^BN-' || v_age || '-([0-9]{4})$'))[1]::int), 0)
  into v_max
  from public.book_copies
  where sku like 'BN-' || v_age || '-%';

  v_next := v_max + 1;
  v_sku := 'BN-' || v_age || '-' || lpad(v_next::text, 4, '0');

  return v_sku;
end;
$$;

-- Commit a whole intake batch in one call, row-level errors captured, rest continue
create or replace function public.commit_intake_batch(p_batch_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_batch public.intake_batches%rowtype;
  v_item public.intake_batch_items%rowtype;
  v_title_id uuid;
  v_qty int;
  v_i int;
  v_age text;
  v_sku text;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_failed int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_has_bin_id boolean := false;
  _attempt int;
begin
  select * into v_batch
  from public.intake_batches
  where id = p_batch_id
  for update;

  if not found then
    raise exception 'Batch not found: %', p_batch_id;
  end if;

  if v_batch.status <> 'open' then
    raise exception 'Batch % is not open (status=%)', p_batch_id, v_batch.status;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'book_copies'
      and column_name = 'bin_id'
  ) into v_has_bin_id;

  for v_item in
    select *
    from public.intake_batch_items
    where batch_id = p_batch_id
    order by created_at asc
  loop
    begin
      -- Reset prior error before attempt
      update public.intake_batch_items set error = null where id = v_item.id;

      if v_item.action = 'skip' then
        v_skipped := v_skipped + 1;
        continue;
      end if;

      v_age := upper(coalesce(nullif(v_item.final_age_tier, ''), nullif(v_item.suggested_age_tier, ''), 'FLED'));
      if v_age not in ('HATCH', 'FLED', 'SOAR', 'SKY') then
        raise exception 'Missing/invalid final_age_tier for ISBN %', v_item.isbn;
      end if;

      if coalesce(v_item.final_bin, '') = '' then
        raise exception 'Missing final_bin for ISBN %', v_item.isbn;
      end if;

      if v_item.existing_book_id is not null then
        v_title_id := v_item.existing_book_id;
      else
        -- Upsert title by ISBN from metadata
        insert into public.book_titles (isbn, title, author, cover_url)
        values (
          v_item.isbn,
          coalesce(v_item.metadata->>'title', 'Unknown Title'),
          coalesce(v_item.metadata->>'author', 'Unknown Author'),
          nullif(v_item.metadata->>'coverUrl', '')
        )
        on conflict (isbn) do update
          set title = excluded.title,
              author = excluded.author,
              cover_url = coalesce(public.book_titles.cover_url, excluded.cover_url)
        returning id into v_title_id;
      end if;

      v_qty := greatest(1, least(coalesce(v_item.qty, 1), 200));

      -- create/increase_qty/new_copy all produce physical copies in this system
      for v_i in 1..v_qty loop
        -- retry tiny loop in unlikely unique race; advisory lock should serialize per age
        for _attempt in 1..5 loop
          begin
            v_sku := public.next_book_copy_sku(v_age);

            if v_has_bin_id then
              execute $sql$
                insert into public.book_copies
                  (book_title_id, isbn, age_group, bin_id, status, sku, label_status)
                values
                  ($1, $2, $3, $4, 'in_house', $5, 'pending')
              $sql$
              using v_title_id, v_item.isbn, v_age, v_item.final_bin, v_sku;
            else
              execute $sql$
                insert into public.book_copies
                  (book_title_id, isbn, age_group, bin, status, sku, label_status)
                values
                  ($1, $2, $3, $4, 'in_house', $5, 'pending')
              $sql$
              using v_title_id, v_item.isbn, v_age, v_item.final_bin, v_sku;
            end if;

            exit;
          exception
            when unique_violation then
              if _attempt = 5 then
                raise exception 'Could not generate unique SKU for ISBN % after retries', v_item.isbn;
              end if;
          end;
        end loop;
      end loop;

      if v_item.action = 'increase_qty' then
        v_updated := v_updated + 1;
      else
        v_created := v_created + 1;
      end if;

    exception
      when others then
        v_failed := v_failed + 1;

        update public.intake_batch_items
        set error = sqlerrm
        where id = v_item.id;

        v_errors := v_errors || jsonb_build_object(
          'item_id', v_item.id,
          'isbn', v_item.isbn,
          'error', sqlerrm
        );
    end;
  end loop;

  update public.intake_batches
  set status = 'committed',
      committed_at = now()
  where id = p_batch_id;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'failed', v_failed,
    'errors', v_errors
  );
end;
$$;

commit;
