-- Diagnostic for "permission denied for the table posts" on Supabase
-- Paste ALL of this in the SQL Editor and run.

-- 1. Are the tables actually present?
select tablename, schemaname
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'posts', 'post_likes', 'comments', 'shares')
order by tablename;

-- 2. Does ensure_my_profile exist as a function?
select proname, proretset, proargnames, pronargs
from pg_proc
where proname = 'ensure_my_profile';

-- 3. Which policies exist on posts?
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where tablename = 'posts';

-- 4. Who owns the posts table, and what grants exist?
select
  t.schemaname,
  t.tablename,
  pg_get_userbyid(t.relowner) as table_owner
from pg_tables t
where t.tablename = 'posts' and t.schemaname = 'public';

-- 5. Explicit grants on posts (for debugging permission denied)
select
  grantee,
  privilege_type,
  is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'posts';

-- 6. The active session role / auth context
select current_user, session_user, is_member('authenticated'::name) as is_authenticated_member;
