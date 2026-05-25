-- MiniMax E2E setup (run after migration 004 + 005 are already applied).
--
-- Two prerequisite manual steps you (the human) must do BEFORE running this:
--   1) Migrations 004 and 005 applied: see packages/server/src/database/migrations/.
--   2) An admin account exists in admin_users (sign up at http://localhost:1992/register first).
--
-- This script does TWO things:
--   A) Promote a specific admin email to OWNER so /admin/ai/* RBAC passes
--      (root cause of the prior 403 in earlier E2E reports).
--   B) Verify MiniMax provider seed exists and model_catalog projection landed.
--
-- Usage:
--   docker exec -i <ice-cola-postgres> psql -U postgres -d icecola \
--     -v admin_email='you@example.com' -f /path/to/setup_minimax_e2e.sql
--
-- Or interactively:
--   docker exec -it <ice-cola-postgres> psql -U postgres -d icecola
--   \set admin_email 'you@example.com'
--   \i packages/server/scripts/setup_minimax_e2e.sql

-- =========================================================================
-- A. Promote admin to OWNER. Falls back to a soft warning when no such user.
-- =========================================================================
DO $$
DECLARE
    target_email TEXT := current_setting('myapp.admin_email', true);
    affected_rows INTEGER;
BEGIN
    IF target_email IS NULL OR target_email = '' THEN
        target_email := :'admin_email';
    END IF;

    IF target_email IS NULL OR target_email = '' THEN
        RAISE NOTICE 'No admin_email provided. Set with: \set admin_email ''you@example.com''';
        RETURN;
    END IF;

    UPDATE admin_users
       SET role = 'OWNER', "updatedAt" = NOW()
     WHERE email = target_email;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    IF affected_rows = 0 THEN
        RAISE NOTICE 'No admin_users row matched email %. Register that admin first, then re-run.', target_email;
    ELSE
        RAISE NOTICE 'Promoted % to OWNER (% row(s) affected).', target_email, affected_rows;
    END IF;
END $$;

-- =========================================================================
-- B. Verify MiniMax provider + model_catalog projection landed.
-- =========================================================================
SELECT 'minimax provider row' AS check, COUNT(*) AS count
FROM ai_providers WHERE code = 'minimax';

SELECT 'minimax models in ai_models' AS check, COUNT(*) AS count
FROM ai_models m
JOIN ai_providers p ON p.id = m.provider_id
WHERE p.code = 'minimax';

SELECT 'minimax models in model_catalog' AS check, COUNT(*) AS count
FROM model_catalog
WHERE model_name IN ('MiniMax-M2.7', 'abab6.5s-chat');

SELECT id, model_name, display_name, rank, cost_multiplier, required_plan_level, is_active
  FROM model_catalog
 WHERE model_name IN ('MiniMax-M2.7', 'abab6.5s-chat')
 ORDER BY rank;

-- Expected after a clean run:
--   minimax provider row              count = 1
--   minimax models in ai_models       count >= 2 (depends on seed)
--   minimax models in model_catalog   count = 2  (MiniMax-M2.7 + abab6.5s-chat)
