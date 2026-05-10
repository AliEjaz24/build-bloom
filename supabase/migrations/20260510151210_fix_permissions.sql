
-- Fix admin permissions for roles and profiles
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.handle_new_user() to authenticated;
