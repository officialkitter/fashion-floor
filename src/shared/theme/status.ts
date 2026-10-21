import { colors } from './tokens';
import type { Status } from '../types/domain';

/** Single source of truth for functional status colors. */
export const STATUS_META: Record<Status, { label: string; color: string }> = {
  in_stock: { label: 'In stock', color: colors.success },
  low_stock: { label: 'Low stock', color: colors.warning },
  out_of_stock: { label: 'Sold out', color: colors.danger },
  available: { label: 'Available', color: colors.success },
  held: { label: 'Held', color: colors.warning },
  taken: { label: 'Taken', color: colors.slate },
  booked: { label: 'Booked', color: colors.success },
  cancelled: { label: 'Cancelled', color: colors.danger },
  pending: { label: 'Pending', color: colors.warning },
  processing: { label: 'Processing', color: colors.warning },
  paid: { label: 'Paid', color: colors.success },
  error: { label: 'Error', color: colors.danger },
};
