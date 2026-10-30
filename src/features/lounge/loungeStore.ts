import { createCachedResource } from '../../shared/state/createCachedResource';
import type { Stylist } from '../../shared/types/domain';

export const useLoungeStore = createCachedResource<Stylist>('lounge-stylists-v2', '/v1/lounge/stylists');
