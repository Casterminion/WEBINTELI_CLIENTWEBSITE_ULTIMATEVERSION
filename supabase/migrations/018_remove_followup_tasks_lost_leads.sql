-- Allow admins to remove tasks (e.g. when a lead is marked lost)
create policy "Allow authenticated delete tasks"
  on public.tasks for delete to authenticated using (true);

-- Remove follow-up tasks for leads marked lost (cleanup + single source of truth with app logic)
delete from public.tasks t
using public.intake_submissions l
where t.lead_id = l.id
  and l.status = 'lost'
  and t.task_type = 'follow_up';
