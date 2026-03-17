-- Allow authenticated users (admins) to delete intake submissions
create policy "Allow authenticated delete intake_submissions"
  on public.intake_submissions for delete
  to authenticated
  using (true);
