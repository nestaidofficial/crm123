-- Agency invitations table for pending member invites
create table if not exists agency_invitations (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references agencies(id) on delete cascade,
  email          text not null,
  role           app_role not null default 'viewer',
  invited_by     uuid references auth.users(id) on delete set null,
  token          text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at     timestamptz not null default (now() + interval '7 days'),
  accepted_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- Unique pending invite per email+agency
create unique index if not exists agency_invitations_agency_email_pending_idx
  on agency_invitations (agency_id, lower(email))
  where accepted_at is null;

-- RLS
alter table agency_invitations enable row level security;

-- Agency admins/owners can see all invitations for their agency
create policy "agency admins can view invitations"
  on agency_invitations for select
  using (has_agency_role(agency_id, array['owner','admin']::app_role[]));

-- Agency admins/owners can insert invitations
create policy "agency admins can create invitations"
  on agency_invitations for insert
  with check (has_agency_role(agency_id, array['owner','admin']::app_role[]));

-- Agency admins/owners can delete invitations
create policy "agency admins can delete invitations"
  on agency_invitations for delete
  using (has_agency_role(agency_id, array['owner','admin']::app_role[]));
