import { createCachedResource } from '../../shared/state/createCachedResource';
import type { FashionBuilding } from '../../shared/types/domain';

export const useBuildingStore = createCachedResource<FashionBuilding>(
  'lounge-buildings-preview-v1',
  '/v1/lounge/buildings',
);
