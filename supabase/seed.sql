-- =============================================================================
-- Dr Agenda Núcleos — Datos Ficticios de Demostración (Seed SQL para Supabase CLI)
-- Nota: Puede ejecutarse con `supabase db reset` o mediante `npm run db:seed`
-- =============================================================================

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, is_active)
VALUES
  ('44444444-4444-4444-8444-444444444441', 'laura@nucleodemo.mx', crypt('Demo2026!', gen_salt('bf')), '{"full_name":"Laura Méndez","demo_role":"reception"}'::jsonb, true),
  ('44444444-4444-4444-8444-444444444442', 'admin@nucleodemo.mx', crypt('Demo2026!', gen_salt('bf')), '{"full_name":"Dr. Alejandro Vega","demo_role":"admin"}'::jsonb, true),
  ('44444444-4444-4444-8444-444444444443', 'sofia@nucleodemo.mx', crypt('Demo2026!', gen_salt('bf')), '{"full_name":"Dra. Sofía García","demo_role":"professional"}'::jsonb, true),
  ('44444444-4444-4444-8444-444444444444', 'pablo@nucleodemo.mx', crypt('Demo2026!', gen_salt('bf')), '{"full_name":"Dr. Pablo Ruiz","demo_role":"professional"}'::jsonb, true),
  ('44444444-4444-4444-8444-444444444445', 'elena@nucleodemo.mx', crypt('Demo2026!', gen_salt('bf')), '{"full_name":"Lic. Elena Martínez","demo_role":"professional"}'::jsonb, true),
  ('99999999-4444-4444-8444-999999999991', 'intruder@nucleonorte.mx', crypt('Demo2026!', gen_salt('bf')), '{"full_name":"Roberto Garza","demo_role":"admin"}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, slug, name, currency, default_timezone, status)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'nucleo-demo', 'Núcleo Demo', 'MXN', 'America/Mexico_City', 'active'),
  ('99999999-9999-4999-8999-999999999999', 'nucleo-norte', 'Núcleo Norte Privado', 'MXN', 'America/Monterrey', 'active')
ON CONFLICT (id) DO NOTHING;
