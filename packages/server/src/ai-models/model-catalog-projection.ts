import { PoolClient } from 'pg';
import { CreateModelDto, UpdateModelDto } from './dto/model.dto';

interface AiModelCatalogSource {
  provider_id: string;
  name: string;
  model_id: string;
  description?: string | null;
  status?: string | null;
  enabled?: boolean | null;
}

interface CatalogProjectionInput {
  providerId: string;
  modelName: string;
  displayName: string;
  description: string | null;
  rank: number;
  costMultiplier: number;
  requiredPlanLevel: number;
  isActive: boolean;
}

interface CatalogProjectionDefaults {
  rank?: number;
  costMultiplier?: number;
  requiredPlanLevel?: number;
}

function modelIsActive(model: AiModelCatalogSource): boolean {
  if (model.status) {
    return model.status === 'active';
  }

  return model.enabled !== false;
}

export function buildCatalogProjection(
  model: AiModelCatalogSource,
  data: CreateModelDto | UpdateModelDto,
  defaults: CatalogProjectionDefaults = {},
): CatalogProjectionInput {
  const isActive = modelIsActive(model) && (data.isCatalogVisible ?? true);

  return {
    providerId: model.provider_id,
    modelName: model.model_id,
    displayName: data.displayName?.trim() || model.name,
    description: data.description === undefined ? model.description ?? null : data.description ?? null,
    rank: data.rank ?? defaults.rank ?? 1,
    costMultiplier: data.costMultiplier ?? defaults.costMultiplier ?? 1,
    requiredPlanLevel: data.requiredPlanLevel ?? defaults.requiredPlanLevel ?? 0,
    isActive,
  };
}

export async function upsertModelCatalogProjection(
  client: PoolClient,
  projection: CatalogProjectionInput,
): Promise<void> {
  await client.query(
    `INSERT INTO model_catalog (
       provider_id,
       model_name,
       display_name,
       description,
       rank,
       cost_multiplier,
       required_plan_level,
       is_active,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (model_name)
     DO UPDATE SET provider_id = EXCLUDED.provider_id,
                   display_name = EXCLUDED.display_name,
                   description = EXCLUDED.description,
                   rank = EXCLUDED.rank,
                   cost_multiplier = EXCLUDED.cost_multiplier,
                   required_plan_level = EXCLUDED.required_plan_level,
                   is_active = EXCLUDED.is_active,
                   updated_at = CURRENT_TIMESTAMP`,
    [
      projection.providerId,
      projection.modelName,
      projection.displayName,
      projection.description,
      projection.rank,
      projection.costMultiplier,
      projection.requiredPlanLevel,
      projection.isActive,
    ],
  );
}

export async function deactivateModelCatalogProjection(
  client: PoolClient,
  modelName: string,
): Promise<void> {
  await client.query(
    `UPDATE model_catalog SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE model_name = $1`,
    [modelName],
  );
}
