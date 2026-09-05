import {
  InventoryMovementType,
  movementSign,
  requiredApproverRole,
  RoleName,
} from '@agrogood/shared';

describe('Lógica de inventario y compras (funciones puras)', () => {
  describe('movementSign', () => {
    it('las entradas suman', () => {
      expect(movementSign(InventoryMovementType.RECEPCION)).toBe(1);
      expect(movementSign(InventoryMovementType.ENTRADA)).toBe(1);
      expect(movementSign(InventoryMovementType.DEVOLUCION)).toBe(1);
    });
    it('las salidas restan', () => {
      expect(movementSign(InventoryMovementType.MERMA)).toBe(-1);
      expect(movementSign(InventoryMovementType.SALIDA)).toBe(-1);
      expect(movementSign(InventoryMovementType.DESPACHO)).toBe(-1);
    });
  });

  describe('requiredApproverRole (umbrales §41)', () => {
    it('< 100.000 → Encargado de compras', () => {
      expect(requiredApproverRole(50_000)).toBe(RoleName.ENCARGADO_COMPRAS);
      expect(requiredApproverRole(0)).toBe(RoleName.ENCARGADO_COMPRAS);
    });
    it('100.000–500.000 → Jefe de operaciones', () => {
      expect(requiredApproverRole(100_000)).toBe(RoleName.JEFE_OPERACIONES);
      expect(requiredApproverRole(499_999)).toBe(RoleName.JEFE_OPERACIONES);
    });
    it('>= 500.000 → Gerencia', () => {
      expect(requiredApproverRole(500_000)).toBe(RoleName.GERENTE);
      expect(requiredApproverRole(2_000_000)).toBe(RoleName.GERENTE);
    });
  });
});
