import {
  DeliveryItemStatus,
  DeliveryStatus,
  resolveDeliveryStatus,
} from '@agrogood/shared';

describe('resolveDeliveryStatus (prompt §23)', () => {
  const ok = { status: DeliveryItemStatus.ENTREGADO };
  const rej = { status: DeliveryItemStatus.RECHAZADO };

  it('todo entregado → ENTREGADO', () => {
    expect(resolveDeliveryStatus([ok, ok])).toBe(DeliveryStatus.ENTREGADO);
  });

  it('nada entregado → RECHAZADO', () => {
    expect(resolveDeliveryStatus([rej, rej])).toBe(DeliveryStatus.RECHAZADO);
  });

  it('mezcla → RECHAZADO_PARCIAL', () => {
    expect(resolveDeliveryStatus([ok, rej])).toBe(
      DeliveryStatus.RECHAZADO_PARCIAL,
    );
  });

  it('sin líneas → ENTREGADO (sin rechazos)', () => {
    expect(resolveDeliveryStatus([])).toBe(DeliveryStatus.ENTREGADO);
  });
});
