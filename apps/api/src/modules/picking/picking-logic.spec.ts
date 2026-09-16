import {
  canTransitionPicking,
  canTransitionRoute,
  PickingItemStatus,
  PickingStatus,
  pickingHasUnjustifiedDifference,
  PickingItemLike,
  resolvePickingOutcome,
  RouteStatus,
} from '@agrogood/shared';

const ok = (
  solicitada: number,
  pickeada: number,
  observacion?: string,
): PickingItemLike => ({
  cantidadSolicitada: solicitada,
  cantidadPickeada: pickeada,
  estado: PickingItemStatus.OK,
  observacion,
});

describe('Lógica de picking y rutas (funciones puras)', () => {
  describe('pickingHasUnjustifiedDifference (§17/§37)', () => {
    it('sin diferencias → se puede cerrar', () => {
      expect(pickingHasUnjustifiedDifference([ok(10, 10), ok(5, 5)])).toBe(false);
    });

    it('menor cantidad sin justificar → bloquea', () => {
      expect(pickingHasUnjustifiedDifference([ok(10, 8)])).toBe(true);
    });

    it('menor cantidad justificada → permite', () => {
      expect(
        pickingHasUnjustifiedDifference([ok(10, 8, 'Solo quedaban 8 en cámara')]),
      ).toBe(false);
    });

    it('faltante sin justificar → bloquea, con justificación → permite', () => {
      const faltante = (obs?: string): PickingItemLike => ({
        cantidadSolicitada: 10,
        cantidadPickeada: 0,
        estado: PickingItemStatus.FALTANTE,
        observacion: obs,
      });
      expect(pickingHasUnjustifiedDifference([faltante()])).toBe(true);
      expect(pickingHasUnjustifiedDifference([faltante('Sin stock')])).toBe(false);
    });

    it('observación en blanco no cuenta como justificación', () => {
      expect(pickingHasUnjustifiedDifference([ok(10, 9, '   ')])).toBe(true);
    });
  });

  describe('resolvePickingOutcome', () => {
    it('todo OK y completo → COMPLETADO', () => {
      expect(resolvePickingOutcome([ok(10, 10), ok(4, 4)])).toBe(
        PickingStatus.COMPLETADO,
      );
    });
    it('con faltante → INCOMPLETO', () => {
      expect(
        resolvePickingOutcome([
          ok(10, 10),
          {
            cantidadSolicitada: 5,
            cantidadPickeada: 0,
            estado: PickingItemStatus.FALTANTE,
            observacion: 'Sin stock',
          },
        ]),
      ).toBe(PickingStatus.INCOMPLETO);
    });
  });

  describe('máquinas de estado', () => {
    it('picking: transiciones válidas e inválidas', () => {
      expect(
        canTransitionPicking(PickingStatus.PENDIENTE, PickingStatus.EN_PROCESO),
      ).toBe(true);
      expect(
        canTransitionPicking(PickingStatus.EN_PROCESO, PickingStatus.COMPLETADO),
      ).toBe(true);
      expect(
        canTransitionPicking(PickingStatus.COMPLETADO, PickingStatus.EN_PROCESO),
      ).toBe(false);
    });

    it('ruta: la salida solo desde CARGANDO; COMPLETADA es terminal', () => {
      expect(canTransitionRoute(RouteStatus.CARGANDO, RouteStatus.EN_RUTA)).toBe(
        true,
      );
      expect(
        canTransitionRoute(RouteStatus.PLANIFICADA, RouteStatus.EN_RUTA),
      ).toBe(false);
      expect(
        canTransitionRoute(RouteStatus.EN_RUTA, RouteStatus.COMPLETADA),
      ).toBe(true);
      expect(
        canTransitionRoute(RouteStatus.COMPLETADA, RouteStatus.EN_RUTA),
      ).toBe(false);
    });
  });
});
