import React from 'react';
import * as Haptics from 'expo-haptics';
import { Chip, ChipState } from '../../shared/components/Chip';
import { loungeColors } from '../../shared/theme/tokens';
import type { Stylist, TimeSlot } from '../../shared/types/domain';
import { formatTime } from '../../shared/utils/format';
import { selectHasSlot, useCartStore } from '../cart/cartStore';

interface Props {
  stylist: Stylist;
  slot: TimeSlot;
  buildingName?: string;
}

/** One tap reserves the slot: the chip turns Mint Green and joins the unified cart. */
export function SlotChip({ stylist, slot, buildingName }: Props) {
  const selected = useCartStore(selectHasSlot(slot.id));
  const toggleSlot = useCartStore((s) => s.toggleSlot);

  const available = slot.status === 'available';
  const state: ChipState = selected ? 'active' : available ? 'default' : 'disabled';
  const time = formatTime(slot.starts_at);

  return (
    <Chip
      label={time}
      state={state}
      activeColor={loungeColors.success}
      activeTextColor={loungeColors.white}
      inactiveColor={loungeColors.offWhite}
      inactiveTextColor={loungeColors.black}
      dotColor={slot.status === 'held' ? loungeColors.warning : undefined}
      accessibilityLabel={
        available ? `${selected ? 'Release' : 'Book'} ${time} with ${stylist.name}` : `${time}, ${slot.status}`
      }
      onPress={() => {
        Haptics.selectionAsync();
        toggleSlot(stylist, slot, buildingName);
      }}
    />
  );
}
