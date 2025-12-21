-- Create the savings_investments table for Trinity Oil Mills
CREATE TABLE IF NOT EXISTS savings_investments (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL COMMENT 'savings, investment, fixed_deposit, mutual_fund, stock, property, gold, other',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2),
  investment_date DATETIME NOT NULL,
  maturity_date DATETIME,
  interest_rate DECIMAL(5,2),
  institution VARCHAR(255) COMMENT 'Bank, broker, etc.',
  account_number VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active' COMMENT 'active, matured, closed, sold',
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add index for better query performance
CREATE INDEX idx_savings_investments_user_id ON savings_investments(user_id);
CREATE INDEX idx_savings_investments_type ON savings_investments(type);
CREATE INDEX idx_savings_investments_status ON savings_investments(status);
CREATE INDEX idx_savings_investments_investment_date ON savings_investments(investment_date);

-- Insert some sample data for testing
INSERT INTO savings_investments (
  id, type, title, description, amount, current_value, investment_date, maturity_date, 
  interest_rate, institution, account_number, status, user_id
) VALUES 
(
  'si-sample-001', 
  'fixed_deposit', 
  'SBI Fixed Deposit', 
  'High interest rate FD for 1 year', 
  100000.00, 
  108500.00, 
  '2024-01-15 10:00:00', 
  '2025-01-15 10:00:00', 
  8.5, 
  'State Bank of India', 
  'FD-001-2024', 
  'active', 
  'admin-001'
),
(
  'si-sample-002', 
  'mutual_fund', 
  'HDFC Equity Fund', 
  'Diversified equity mutual fund', 
  50000.00, 
  52500.00, 
  '2024-03-20 14:30:00', 
  NULL, 
  NULL, 
  'HDFC Mutual Fund', 
  'MF-HDFC-789', 
  'active', 
  'admin-001'
),
(
  'si-sample-003', 
  'gold', 
  'Gold Investment', 
  'Physical gold purchase', 
  25000.00, 
  26800.00, 
  '2024-06-10 09:15:00', 
  NULL, 
  NULL, 
  'Local Jeweller', 
  NULL, 
  'active', 
  'admin-001'
);

-- Verify the table was created successfully
SELECT 'Table created successfully' as message;
SELECT COUNT(*) as sample_records_count FROM savings_investments;
