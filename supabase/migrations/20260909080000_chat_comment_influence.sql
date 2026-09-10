-- ==============================================================================
-- KINETIC CINEMA // Migration: Chat Comment Influence Flag
-- Marks a chat comment as already used for narrative influence so the random
-- comment picker never reuses it in a later round.
-- ==============================================================================

alter table public.chat_messages
  add column if not exists used_for_influence boolean not null default false;

-- Ensure service_role can manage all columns
grant all on public.chat_messages to service_role;
