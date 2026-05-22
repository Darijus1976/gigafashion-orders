-- Add accepted_by column to payments table
ALTER TABLE payments
ADD COLUMN accepted_by text;
