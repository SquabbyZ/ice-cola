-- Migration: Fix null team_id for existing users
-- Purpose: Create personal teams for users who have null team_id
-- This script is idempotent and can be safely re-run

DO $$
DECLARE
    user_record RECORD;
    new_team_id UUID;
    team_name TEXT;
BEGIN
    -- Find all users with null team_id
    FOR user_record IN
        SELECT id, email, name
        FROM users
        WHERE team_id IS NULL
    LOOP
        -- Generate team name from user's name or email
        team_name := COALESCE(user_record.name, split_part(user_record.email, '@', 1)) || '''s Team';

        -- Create personal team for this user
        INSERT INTO teams (id, name, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            team_name,
            NOW(),
            NOW()
        )
        RETURNING id INTO new_team_id;

        -- Update user's team_id
        UPDATE users
        SET team_id = new_team_id, updated_at = NOW()
        WHERE id = user_record.id;

        -- Create team membership record
        INSERT INTO team_members (team_id, user_id, role, created_at)
        VALUES (new_team_id, user_record.id, 'owner', NOW())
        ON CONFLICT DO NOTHING;

        -- Initialize Lingqi quota for the new team (1000 initial balance)
        INSERT INTO lingqi_status (team_id, balance, total_granted, total_consumed, created_at, updated_at)
        VALUES (new_team_id, 1000, 1000, 0, NOW(), NOW())
        ON CONFLICT (team_id) DO NOTHING;

        RAISE NOTICE 'Created team % (%) for user % (%)', new_team_id, team_name, user_record.id, user_record.email;
    END LOOP;

    -- Summary
    RAISE NOTICE 'Migration complete. Fixed % users with null team_id',
        (SELECT COUNT(*) FROM users WHERE team_id IS NOT NULL AND id IN (
            SELECT id FROM users WHERE team_id IS NULL
        ));
END $$;
