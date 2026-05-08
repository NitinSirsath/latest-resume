ALTER TABLE public.usage_credits
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS usage_credits_stripe_customer_id_idx ON public.usage_credits(stripe_customer_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert 3 free credits for new users (down from previous default)
  INSERT INTO public.usage_credits (user_id, credits, credits_remaining, plan)
  VALUES (new.id, 3, 3, 'free');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
