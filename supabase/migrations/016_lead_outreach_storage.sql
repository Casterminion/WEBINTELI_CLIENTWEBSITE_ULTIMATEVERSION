-- Private bucket for call recordings (MP3) linked to lead_outreach_events.audio_storage_path
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-outreach',
  'lead-outreach',
  false,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/wav']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated insert lead-outreach objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lead-outreach');

create policy "Authenticated select lead-outreach objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lead-outreach');

create policy "Authenticated update lead-outreach objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lead-outreach')
  with check (bucket_id = 'lead-outreach');

create policy "Authenticated delete lead-outreach objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lead-outreach');
