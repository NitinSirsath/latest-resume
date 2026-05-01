CREATE TABLE usage_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    credits INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to automatically create a row for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usage_credits (user_id, credits)
  VALUES (new.id, 10);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_credits();

-- RPC to decrement credits safely
CREATE OR REPLACE FUNCTION public.decrement_credits(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.usage_credits
  SET credits = credits - 1, updated_at = NOW()
  WHERE user_id = target_user_id AND credits > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
