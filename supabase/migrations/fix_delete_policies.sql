-- Fix RLS policies for events table to ensure DELETE operations work correctly

-- Drop the conflicting ALL policy that might be interfering with DELETE
DROP POLICY IF EXISTS "Users can manage all own events" ON events;

-- Ensure we have clean, specific policies
DROP POLICY IF EXISTS "Users can delete own events" ON events;

-- Recreate the delete policy with proper configuration
CREATE POLICY "Users can delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also recreate the reminders delete policy to ensure consistency
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

CREATE POLICY "Users can delete own reminders"
  ON reminders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
