CREATE TABLE IF NOT EXISTS public.rate_limits (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bucket TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, bucket)
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_bucket TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    SELECT request_count, window_start INTO v_count, v_window_start
    FROM public.rate_limits
    WHERE user_id = p_user_id AND bucket = p_bucket;

    IF NOT FOUND THEN
        INSERT INTO public.rate_limits (user_id, bucket)
        VALUES (p_user_id, p_bucket);
        RETURN TRUE;
    END IF;

    IF v_window_start < NOW() - (p_window_seconds || ' seconds')::INTERVAL THEN
        UPDATE public.rate_limits
        SET request_count = 1, window_start = NOW()
        WHERE user_id = p_user_id AND bucket = p_bucket;
        RETURN TRUE;
    END IF;

    IF v_count < p_limit THEN
        UPDATE public.rate_limits
        SET request_count = request_count + 1
        WHERE user_id = p_user_id AND bucket = p_bucket;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
