-- ============================================================================
-- Atlas Insight AI — 0005 Storage buckets and policies.
-- Files are stored under <workspace_id>/<file_id>/<name> so policies can
-- authorize by path prefix.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('workspace-files', 'workspace-files', false)
on conflict (id) do nothing;

drop policy if exists workspace_files_read on storage.objects;
create policy workspace_files_read on storage.objects for select
  using (
    bucket_id = 'workspace-files'
    and app.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists workspace_files_write on storage.objects;
create policy workspace_files_write on storage.objects for insert
  with check (
    bucket_id = 'workspace-files'
    and app.has_workspace_role(((storage.foldername(name))[1])::uuid, 'EDITOR')
  );

drop policy if exists workspace_files_delete on storage.objects;
create policy workspace_files_delete on storage.objects for delete
  using (
    bucket_id = 'workspace-files'
    and app.has_workspace_role(((storage.foldername(name))[1])::uuid, 'EDITOR')
  );
