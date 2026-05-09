DROP POLICY IF EXISTS "notif update own read flag" ON public.notifications;
CREATE POLICY "notif update own or audience" ON public.notifications
FOR UPDATE TO authenticated
USING (recipient_id = auth.uid() OR (audience IS NOT NULL AND has_role(auth.uid(), audience)))
WITH CHECK (recipient_id = auth.uid() OR (audience IS NOT NULL AND has_role(auth.uid(), audience)));