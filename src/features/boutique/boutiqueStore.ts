import { createCachedResource } from '../../shared/state/createCachedResource';
import type { Product } from '../../shared/types/domain';

export const useBoutiqueStore = createCachedResource<Product>('boutique-products', '/v1/boutique/products');
