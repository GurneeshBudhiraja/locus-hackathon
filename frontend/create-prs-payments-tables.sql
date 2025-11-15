-- Create pull_requests table to track GitHub PRs
CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  pr_number INTEGER NOT NULL,
  pr_title VARCHAR(500) NOT NULL,
  pr_state VARCHAR(50) NOT NULL, -- 'open', 'closed', 'merged'
  pr_url TEXT NOT NULL,
  pr_author VARCHAR(255) NOT NULL,
  pr_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  pr_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  pr_merged_at TIMESTAMP WITH TIME ZONE,
  amount_payable DECIMAL(18, 2),
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contractor_id, pr_number)
);

-- Create payments table to track payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  pull_request_id UUID REFERENCES pull_requests(id) ON DELETE SET NULL,
  amount DECIMAL(18, 2) NOT NULL,
  payment_status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed'
  transaction_hash VARCHAR(255),
  wallet_address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pull_requests_contractor_id ON pull_requests(contractor_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_state ON pull_requests(pr_state);
CREATE INDEX IF NOT EXISTS idx_pull_requests_is_paid ON pull_requests(is_paid);
CREATE INDEX IF NOT EXISTS idx_payments_contractor_id ON payments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_payments_pull_request_id ON payments(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- Create trigger to update updated_at timestamp for pull_requests
CREATE TRIGGER update_pull_requests_updated_at
  BEFORE UPDATE ON pull_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at timestamp for payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for pull_requests
CREATE POLICY "Allow authenticated users to read pull_requests"
  ON pull_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert pull_requests"
  ON pull_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update pull_requests"
  ON pull_requests
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous users to read pull_requests"
  ON pull_requests
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert pull_requests"
  ON pull_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policies for payments
CREATE POLICY "Allow authenticated users to read payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous users to read payments"
  ON payments
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert payments"
  ON payments
  FOR INSERT
  TO anon
  WITH CHECK (true);

