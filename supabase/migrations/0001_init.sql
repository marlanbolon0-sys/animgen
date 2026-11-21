-- =============================================================
-- AnimGen MVP — Skema PostgreSQL untuk Supabase
-- Jalankan seluruh file ini di SQL Editor Supabase (atau via CLI).
-- Membuat: tabel profil/video/ledger, trigger profil baru (+3 kredit
-- gratis), fungsi kredit atomik, Row Level Security, dan bucket storage.
-- =============================================================

-- 1) PROFIL (perluasan auth.users) ----------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  credits    integer not null default 3 check (credits >= 0), -- 3 kredit gratis pengguna baru
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) VIDEOS (job generasi animasi) ------------------------------
create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  mode             text not null check (mode in ('text', 'image')),
  prompt           text not null check (char_length(prompt) between 3 and 1000),
  image_url        text,            -- first frame untuk mode 'image'
  style            text not null,   -- anime-2d | pixar-3d | kartun | pixel-art | realistis | whiteboard
  ratio            text not null check (ratio in ('9:16', '1:1', '16:9')),
  duration_seconds integer not null check (duration_seconds in (5, 10)),
  status           text not null default 'queued'
                   check (status in ('queued', 'processing', 'completed', 'failed')),
  provider         text,            -- runway | meshy | mock
  provider_job_id  text,            -- ID job di sisi provider
  video_url        text,            -- hasil akhir (MP4)
  error_message    text,
  credits_charged  integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists videos_user_created_idx on public.videos (user_id, created_at desc);
create index if not exists videos_status_idx on public.videos (status);
create index if not exists videos_provider_job_idx on public.videos (provider_job_id);

-- 3) LEDGER KREDIT (audit semua pergerakan kredit) ---------------
create table if not exists public.credit_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  video_id   uuid references public.videos(id) on delete set null,
  delta      integer not null, -- negatif = pemakaian, positif = bonus/refund/pembelian
  reason     text not null check (reason in ('signup_bonus', 'generation', 'refund', 'purchase')),
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- 4) updated_at otomatis -----------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated on public.profiles;
create trigger profiles_touch_updated before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists videos_touch_updated on public.videos;
create trigger videos_touch_updated before update on public.videos
for each row execute function public.touch_updated_at();

-- 5) Pengguna baru → profil otomatis + 3 kredit gratis -----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.credit_ledger (user_id, delta, reason)
  values (new.id, 3, 'signup_bonus');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 6) Operasi kredit ATOMIK (dipanggil server melalui service role)
create or replace function public.use_credits(p_user uuid, p_amount integer, p_video uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare updated integer;
begin
  update public.profiles
  set credits = credits - p_amount, updated_at = now()
  where id = p_user and credits >= p_amount;
  get diagnostics updated = row_count;
  if updated = 0 then
    return false; -- saldo tidak cukup
  end if;
  insert into public.credit_ledger (user_id, video_id, delta, reason)
  values (p_user, p_video, -p_amount, 'generation');
  return true;
end $$;

create or replace function public.refund_credits(p_user uuid, p_amount integer, p_video uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_amount is null or p_amount <= 0 then
    return;
  end if;
  update public.profiles set credits = credits + p_amount, updated_at = now() where id = p_user;
  insert into public.credit_ledger (user_id, video_id, delta, reason)
  values (p_user, p_video, p_amount, 'refund');
end $$;

create or replace function public.add_credits(
  p_user uuid, p_delta integer, p_reason text, p_video uuid default null
)
returns integer
language plpgsql security definer set search_path = public as $$
declare new_balance integer;
begin
  update public.profiles
  set credits = credits + p_delta, updated_at = now()
  where id = p_user
  returning credits into new_balance;
  insert into public.credit_ledger (user_id, video_id, delta, reason)
  values (p_user, p_video, p_delta, p_reason);
  return new_balance;
end $$;

-- 7) ROW LEVEL SECURITY -------------------------------------------
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.credit_ledger enable row level security;

-- Profil: hanya pemilik yang boleh melihat
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid());

-- Video: pemilik boleh melihat & membuat baris job miliknya;
-- perubahan status hanya lewat service role (worker/webhook).
drop policy if exists "videos_select_own" on public.videos;
create policy "videos_select_own" on public.videos
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "videos_insert_own" on public.videos;
create policy "videos_insert_own" on public.videos
for insert to authenticated
with check (user_id = auth.uid());

-- Ledger: hanya pemilik yang boleh melihat
drop policy if exists "ledger_select_own" on public.credit_ledger;
create policy "ledger_select_own" on public.credit_ledger
for select to authenticated
using (user_id = auth.uid());

-- 8) STORAGE: bucket gambar referensi (first frame) ---------------
insert into storage.buckets (id, name, public)
values ('animgen-uploads', 'animgen-uploads', true)
on conflict (id) do nothing;

drop policy if exists "animgen_uploads_public_read" on storage.objects;
create policy "animgen_uploads_public_read" on storage.objects
for select
using (bucket_id = 'animgen-uploads');

drop policy if exists "animgen_uploads_insert_own_folder" on storage.objects;
create policy "animgen_uploads_insert_own_folder" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'animgen-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);
