-- Ensure governed agent exists for The Joint Chiropractic
-- This agent is strictly governed as a RECEPTIONIST (Intake Only)

DO $$
DECLARE
    joint_site_id TEXT; -- site_configs.id is varchar
    joint_agent_id UUID; -- agents.id is uuid
BEGIN
    -- 1. Get the site ID
    SELECT id INTO joint_site_id FROM site_configs WHERE slug = 'the-joint-chiropractic';

    -- Only proceed if site exists
    IF joint_site_id IS NOT NULL THEN
        
        -- 2. Create or Update the Agent
        -- site_config_id is text, joint_site_id is text
        SELECT id INTO joint_agent_id FROM agents 
        WHERE site_config_id = joint_site_id AND role_type = 'receptionist' 
        LIMIT 1;

        IF joint_agent_id IS NULL THEN
            joint_agent_id := gen_random_uuid();
            
            INSERT INTO agents (
                id, 
                site_config_id, 
                name, 
                voice_role, 
                role_type, 
                operational_mode, 
                dominance, 
                influence, 
                steadiness, 
                conscientiousness, 
                created_at, 
                updated_at,
                short_term_memory,
                long_term_memory,
                structured_controls,
                voice_id,
                voice_name
            ) VALUES (
                joint_agent_id,
                joint_site_id,
                'Joint Front Desk AI',
                'AI Receptionist',
                'receptionist',
                'RECEPTIONIST', -- Enforces tool restrictions
                30, -- Low Dominance
                70, -- High Influence
                80, -- High Steadiness
                60, -- Moderate Conscientiousness
                NOW(),
                NOW(),
                '{"specialty": "Chiropractic Receptionist", "focus": "booking appointments and answering basic questions", "method": "checking the schedule and explaining our walk-in policy"}'::jsonb,
                '{"dominantTrait": "Helpful and Efficient", "primaryIntent": "Convert inquiries into visits", "unbreakableRule": "Make up medical advice", "ruleReason": "I am not a doctor"}'::jsonb,
                '{"guardrails": {"always": ["Verify patient identity before sharing info", "Check schedule before booking"], "never": ["Offer medical advice", "Process payments directly"], "believe": ["The provided knowledge base is the source of truth"]}}'::jsonb,
                'Kore',
                'Kore - Calm & Professional'
            );
        ELSE
            -- Update existing agent to ensure governance is applied
            UPDATE agents SET 
                operational_mode = 'RECEPTIONIST',
                structured_controls = '{"guardrails": {"always": ["Verify patient identity before sharing info", "Check schedule before booking"], "never": ["Offer medical advice", "Process payments directly"], "believe": ["The provided knowledge base is the source of truth"]}}'::jsonb,
                updated_at = NOW()
            WHERE id = joint_agent_id;
        END IF;

        -- 3. Link the Agent to the Site Config
        -- assigned_agent_id is text, joint_agent_id is uuid, so cast to text
        UPDATE site_configs 
        SET assigned_agent_id = joint_agent_id::text 
        WHERE id = joint_site_id;

    END IF;
END $$;
