-- Run once on local + server if you don't use POST /api/setup/database
-- mysql -u ... -p ... < scripts/migrate-daily-task-reminders.sql

CREATE TABLE IF NOT EXISTS daily_task_reminders (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  reminder_on DATETIME NULL,
  remarks TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_daily_task_reminders_status (status),
  INDEX idx_daily_task_reminders_reminder_on (reminder_on)
);
