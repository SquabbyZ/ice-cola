-- OpenAI Models
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-5 Pro', 'gpt-5-pro', 'chat', 'Most capable GPT-5', 200000, 5.0, 25.0, 1, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-5-pro');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-5.4 Pro', 'gpt-5.4-pro', 'chat', 'Advanced for coding', 200000, 2.5, 15.0, 2, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-5.4-pro');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-5.4', 'gpt-5.4', 'chat', 'Affordable GPT-5', 180000, 1.25, 10.0, 3, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-5.4');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-5.4 mini', 'gpt-5.4-mini', 'chat', 'Compact GPT-5', 180000, 0.75, 4.5, 4, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-5.4-mini');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-5.4 nano', 'gpt-5.4-nano', 'chat', 'Budget GPT-5', 128000, 0.2, 1.25, 5, 'active', '["chat","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-5.4-nano');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-5.5', 'gpt-5.5', 'chat', 'New intelligence class', 270000, 5.0, 30.0, 6, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-5.5');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-4o', 'gpt-4o', 'chat', 'Latest multimodal', 128000, 2.5, 10.0, 7, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-4o');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-4o Mini', 'gpt-4o-mini', 'chat', 'Fast affordable', 128000, 0.15, 0.6, 8, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-4o-mini');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-4.1', 'gpt-4.1', 'chat', 'Enhanced instruction', 128000, 2.0, 8.0, 9, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-4.1');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-4.1 mini', 'gpt-4.1-mini', 'chat', 'Compact', 128000, 0.4, 1.6, 10, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-4.1-mini');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-4.1 nano', 'gpt-4.1-nano', 'chat', 'Budget', 128000, 0.1, 0.4, 11, 'active', '["chat","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-4.1-nano');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'o1 Pro', 'o1-pro', 'reasoning', 'Most capable reasoning', 200000, 15.0, 60.0, 12, 'active', '["reasoning","math","coding"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'o1-pro');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'o3', 'o3', 'reasoning', 'Advanced reasoning', 200000, 2.0, 8.0, 13, 'active', '["reasoning","math","coding"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'o3');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'o4-mini', 'o4-mini', 'reasoning', 'Compact reasoning', 100000, 1.1, 4.4, 14, 'active', '["reasoning","math"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'o4-mini');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-4 Turbo', 'gpt-4-turbo', 'chat', 'Previous gen', 128000, 10.0, 30.0, 15, 'active', '["chat","vision","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-4-turbo');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-4', 'gpt-4', 'chat', 'Original', 8192, 30.0, 60.0, 16, 'active', '["chat","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-4');
INSERT INTO ai_models (id, provider_id, name, model_id, model_type, description, context_window, input_price_per_1m, output_price_per_1m, sort_order, status, capabilities, created_at, updated_at)
SELECT uuid_generate_v4(), p.id, 'GPT-3.5 Turbo', 'gpt-3.5-turbo', 'chat', 'Fast affordable legacy', 16385, 0.5, 1.5, 17, 'active', '["chat","function_calling"]', NOW(), NOW()
FROM ai_providers p WHERE p.code = 'openai' AND NOT EXISTS (SELECT 1 FROM ai_models m2 WHERE m2.provider_id = p.id AND m2.model_id = 'gpt-3.5-turbo');
