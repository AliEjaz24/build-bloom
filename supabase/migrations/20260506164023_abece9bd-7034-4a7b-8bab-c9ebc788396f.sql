
-- Roles enum + table
create type public.app_role as enum ('admin','teacher','student');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  program text,
  batch int,
  section text,
  department text,
  designation text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_role app_role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'student');
begin
  insert into public.profiles(id, email, full_name, program, batch, section, department, designation)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.raw_user_meta_data->>'program',
    nullif(new.raw_user_meta_data->>'batch','')::int,
    new.raw_user_meta_data->>'section',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'designation'
  );
  insert into public.user_roles(user_id, role) values (new.id, requested_role);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Domain tables
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  credit_hours int not null default 3,
  program text,
  semester int,
  color text default 'teal',
  created_at timestamptz default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text default 'Classroom',
  capacity int default 40,
  location text,
  created_at timestamptz default now()
);

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  program text not null,
  batch int not null,
  section text not null,
  day int not null,
  slot_index int not null,
  course_id uuid references public.courses(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  color text default 'teal',
  created_at timestamptz default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text default 'pending',
  created_at timestamptz default now(),
  unique(student_id, course_id)
);

create table public.makeup_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  original_date date,
  proposed_date date,
  slot_index int,
  room_id uuid references public.rooms(id) on delete set null,
  reason text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table public.cancel_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  cancel_date date,
  slot_index int,
  reason text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  day int not null,
  slot_index int not null,
  status text default 'available',
  unique(teacher_id, day, slot_index)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  audience app_role,
  title text not null,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.courses enable row level security;
alter table public.rooms enable row level security;
alter table public.timetable_slots enable row level security;
alter table public.registrations enable row level security;
alter table public.makeup_requests enable row level security;
alter table public.cancel_requests enable row level security;
alter table public.availability enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles read all auth" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles admin all" on public.profiles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- user_roles
create policy "roles read own or admin" on public.user_roles for select to authenticated using (auth.uid()=user_id or public.has_role(auth.uid(),'admin'));
create policy "roles admin write" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- courses / rooms / timetable
create policy "courses read" on public.courses for select to authenticated using (true);
create policy "courses admin write" on public.courses for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "rooms read" on public.rooms for select to authenticated using (true);
create policy "rooms admin write" on public.rooms for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "timetable read" on public.timetable_slots for select to authenticated using (true);
create policy "timetable admin write" on public.timetable_slots for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- registrations
create policy "registrations read own or admin" on public.registrations for select to authenticated using (auth.uid()=student_id or public.has_role(auth.uid(),'admin'));
create policy "registrations insert own" on public.registrations for insert to authenticated with check (auth.uid()=student_id);
create policy "registrations delete own or admin" on public.registrations for delete to authenticated using (auth.uid()=student_id or public.has_role(auth.uid(),'admin'));
create policy "registrations admin update" on public.registrations for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- makeup
create policy "makeup read own or admin" on public.makeup_requests for select to authenticated using (auth.uid()=teacher_id or public.has_role(auth.uid(),'admin'));
create policy "makeup insert own" on public.makeup_requests for insert to authenticated with check (auth.uid()=teacher_id);
create policy "makeup update own pending or admin" on public.makeup_requests for update to authenticated using (auth.uid()=teacher_id or public.has_role(auth.uid(),'admin')) with check (auth.uid()=teacher_id or public.has_role(auth.uid(),'admin'));
create policy "makeup delete own or admin" on public.makeup_requests for delete to authenticated using (auth.uid()=teacher_id or public.has_role(auth.uid(),'admin'));

-- cancel
create policy "cancel read own or admin" on public.cancel_requests for select to authenticated using (auth.uid()=teacher_id or public.has_role(auth.uid(),'admin'));
create policy "cancel insert own" on public.cancel_requests for insert to authenticated with check (auth.uid()=teacher_id);
create policy "cancel update" on public.cancel_requests for update to authenticated using (auth.uid()=teacher_id or public.has_role(auth.uid(),'admin')) with check (auth.uid()=teacher_id or public.has_role(auth.uid(),'admin'));
create policy "cancel delete" on public.cancel_requests for delete to authenticated using (auth.uid()=teacher_id or public.has_role(auth.uid(),'admin'));

-- availability
create policy "availability read all" on public.availability for select to authenticated using (true);
create policy "availability write own" on public.availability for all to authenticated using (auth.uid()=teacher_id) with check (auth.uid()=teacher_id);

-- notifications
create policy "notif read own or audience or admin" on public.notifications for select to authenticated using (
  recipient_id = auth.uid()
  or (audience is not null and public.has_role(auth.uid(), audience))
  or public.has_role(auth.uid(),'admin')
);
create policy "notif admin write" on public.notifications for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "notif update own read flag" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
