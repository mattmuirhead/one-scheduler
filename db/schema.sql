-- Cleanup section to remove existing objects
drop function if exists create_tenant(text, uuid, text);
drop function if exists join_tenant(text, uuid);
drop function if exists generate_unique_code();
drop function if exists update_updated_at_column();
drop trigger if exists update_tenants_updated_at on public.tenants;
drop trigger if exists update_user_tenants_updated_at on public.user_tenants;
drop type if exists tenant_with_role;
drop type if exists user_role;
drop policy if exists "Users can view their own tenants" on public.tenants;
drop policy if exists "Super admins can update their own tenants" on public.tenants;
drop policy if exists "Users can view their own tenant memberships" on public.user_tenants;
drop policy if exists "Anyone can create a tenant" on public.tenants;
drop policy if exists "Users can insert their own tenant memberships" on public.user_tenants;
drop table if exists public.user_tenants;
drop table if exists public.tenants;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create tenant (school) table
create table public.tenants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  code text unique not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create enum for user roles
create type user_role as enum ('super_admin', 'admin', 'teacher', 'staff');

-- Create user_tenants junction table
create table public.user_tenants (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  role user_role not null default 'staff',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, tenant_id)
);

-- Enable Row Level Security
alter table public.tenants enable row level security;
alter table public.user_tenants enable row level security;

-- Create policies for tenants table
create policy "Users can view their own tenants"
  on public.tenants
  for select
  using (
    id in (
      select tenant_id 
      from public.user_tenants 
      where user_id = auth.uid()
    )
  );

create policy "Super admins can update their own tenants"
  on public.tenants
  for update
  using (
    id in (
      select tenant_id 
      from public.user_tenants 
      where user_id = auth.uid() 
      and role = 'super_admin'
    )
  );

-- Create policies for user_tenants table
create policy "Users can view their own tenant memberships"
  on public.user_tenants
  for select
  using (user_id = auth.uid());

-- Add policies for insert operations
create policy "Anyone can create a tenant"
  on public.tenants
  for insert
  with check (true);

create policy "Users can insert their own tenant memberships"
  on public.user_tenants
  for insert
  with check (user_id = auth.uid());

-- Add index for faster lookups
create index idx_user_tenants_user_id on public.user_tenants(user_id);
create index idx_user_tenants_tenant_id on public.user_tenants(tenant_id);
create index idx_tenants_code on public.tenants(code);
create index idx_tenants_slug on public.tenants(slug);

-- Update return type for both functions
create type tenant_with_role as (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  tenant_code text,
  user_role user_role
);

-- Function to generate a unique invite code
create or replace function generate_unique_code()
returns text
language plpgsql
as $$
declare
  new_code text;
  code_exists boolean;
begin
  loop
    -- Generate a random 8-character code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code exists
    select exists(
      select 1 
      from public.tenants 
      where code = new_code
    ) into code_exists;
    
    -- Exit loop if code is unique
    exit when not code_exists;
  end loop;
  
  return new_code;
end;
$$;

-- Function to create a new tenant
create or replace function public.create_tenant(
  tenant_name text,
  user_id uuid,
  tenant_slug text
)
returns tenant_with_role
language plpgsql
security definer
set search_path = public
as $$
declare
  new_tenant_id uuid;
  new_code text;
  result tenant_with_role;
begin
  -- Generate unique invite code
  new_code := public.generate_unique_code();
  
  -- Create tenant
  insert into public.tenants (name, slug, code)
  values (tenant_name, tenant_slug, new_code)
  returning id into new_tenant_id;
  
  -- Add user as super admin
  insert into public.user_tenants (user_id, tenant_id, role)
  values (create_tenant.user_id, new_tenant_id, 'super_admin');
  
  -- Get result data
  select 
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.code as tenant_code,
    ut.role as user_role
  into result
  from public.tenants t
  join public.user_tenants ut on ut.tenant_id = t.id
  where t.id = new_tenant_id
  and ut.user_id = create_tenant.user_id;
  
  return result;
end;
$$;

-- Function to join existing tenant
create or replace function public.join_tenant(
  invite_code text,
  user_id uuid
)
returns tenant_with_role
language plpgsql
security definer
set search_path = public
as $$
declare
  found_tenant_id uuid;
  result tenant_with_role;
begin
  -- Find tenant by code
  select id into found_tenant_id
  from public.tenants
  where code = upper(invite_code);
  
  if found_tenant_id is null then
    raise exception 'Invalid invite code';
  end if;
  
  -- Check if user is already a member
  if exists (
    select 1 
    from public.user_tenants ut
    where ut.user_id = join_tenant.user_id 
    and ut.tenant_id = found_tenant_id
  ) then
    raise exception 'You are already a member of this school';
  end if;
  
  -- Add user to tenant
  insert into public.user_tenants (user_id, tenant_id, role)
  values (join_tenant.user_id, found_tenant_id, 'staff');
  
  -- Get result data with explicit column references
  select 
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.code as tenant_code,
    new_ut.role as user_role
  into result
  from public.tenants t
  join public.user_tenants new_ut 
    on new_ut.tenant_id = t.id 
    and new_ut.user_id = join_tenant.user_id
  where t.id = found_tenant_id;
  
  return result;
end;
$$;

-- Grant execute permissions
grant execute on function public.create_tenant(text, uuid, text) to authenticated;
grant execute on function public.join_tenant(text, uuid) to authenticated;
grant execute on function public.generate_unique_code() to authenticated;

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_tenants_updated_at
  before update on public.tenants
  for each row
  execute function update_updated_at_column();

create trigger update_user_tenants_updated_at
  before update on public.user_tenants
  for each row
  execute function update_updated_at_column();

