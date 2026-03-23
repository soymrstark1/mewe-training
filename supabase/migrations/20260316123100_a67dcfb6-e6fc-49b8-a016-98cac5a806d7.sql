INSERT INTO public.global_settings (key, value)
VALUES ('live_classes_enabled', 'false')
ON CONFLICT DO NOTHING;