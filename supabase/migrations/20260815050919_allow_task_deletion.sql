grant delete on public.tasks to authenticated;

create policy tasks_creator_delete on public.tasks
  for delete to authenticated
  using (
    (select private.is_member())
    and creator_id = (select auth.uid())
  );
