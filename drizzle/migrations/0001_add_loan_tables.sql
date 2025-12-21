-- Migration: Add Loan Management Tables
-- Created: 2025-01-20

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(255) PRIMARY KEY,
  loan_name VARCHAR(255) NOT NULL,
  lender_name VARCHAR(255) NOT NULL,
  loan_type VARCHAR(100) NOT NULL COMMENT 'business_loan, personal_loan, equipment_loan, working_capital',
  principal_amount DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL COMMENT 'percentage per annum',
  tenure INT NOT NULL COMMENT 'in months',
  emi_amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  account_number VARCHAR(100),
  ifsc_code VARCHAR(20),
  collateral TEXT COMMENT 'Description of collateral if any',
  purpose TEXT NOT NULL COMMENT 'Purpose of the loan',
  status VARCHAR(50) NOT NULL DEFAULT 'active' COMMENT 'active, closed, defaulted',
  remaining_balance DECIMAL(12,2) NOT NULL,
  next_payment_date DATE,
  notes TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_loans_status (status),
  INDEX idx_loans_loan_type (loan_type),
  INDEX idx_loans_created_by (created_by),
  INDEX idx_loans_next_payment_date (next_payment_date),
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS loan_payments (
  id VARCHAR(255) PRIMARY KEY,
  loan_id VARCHAR(255) NOT NULL,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  principal_amount DECIMAL(10,2) NOT NULL,
  interest_amount DECIMAL(10,2) NOT NULL,
  outstanding_balance DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer' COMMENT 'bank_transfer, cash, cheque, upi',
  transaction_id VARCHAR(100),
  receipt_number VARCHAR(100),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'paid' COMMENT 'paid, pending, failed',
  late_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_loan_payments_loan_id (loan_id),
  INDEX idx_loan_payments_payment_date (payment_date),
  INDEX idx_loan_payments_payment_status (payment_status),
  INDEX idx_loan_payments_created_by (created_by),
  
  FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Add comments for documentation
ALTER TABLE loans COMMENT = 'Business loans and financing tracking';
ALTER TABLE loan_payments COMMENT = 'Loan payment history and records';
