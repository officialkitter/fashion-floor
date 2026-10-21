import React from 'react';
import * as Haptics from 'expo-haptics';
import { Chip, ChipState } from '../../shared/components/Chip';
import { colors } from '../../shared/theme/tokens';
import type { Stylist, TimeSlot } from '../../shared/types/domain';
import { formatTime } from '../../shared/utils/format';
import { selectHasSlot, useCartStore } from '../cart/cartStore';

interface Props {
  stylist: Stylist;
  slot: TimeSlot;
}

/** One tap reserves the slot: the chip turns Mint Green and joins the unified cart. */
export function SlotChip({ stylist, slot }: Props) {
  const selected = useCartStore(selectHasSlot(slot.id));
  const toggleSlot = useCartStore((s) => s.toggleSlot);

  const available = slot.status === 'available';
  const state: ChipState = selected ? 'active' : available ? 'default' : 'disabled';
  const time = formatTime(slot.starts_at);

  return (
    <Chip
      label={time}
      state={state}
      dotColor={slot.status === 'held' ? colors.warning : undefined}
      accessibilityLabel={
        available ? `${selected ? 'Release' : 'Book'} ${time} with ${stylist.name}` : `${time}, ${slot.status}`
      }
      onPress={() => {
        Haptics.selectionAsync();
        toggleSlot(stylist, slot);
      }}
    />
  );
}
