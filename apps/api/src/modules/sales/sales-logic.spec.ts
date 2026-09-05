import {
  canTransition,
  classifyStock,
  SalesOrderStatus,
  StockStatus,
} from '@agrogood/shared';

describe('Lógica de ventas (funciones puras)', () => {
  describe('classifyStock', () => {
    it('DISPONIBLE cuando alcanza', () => {
      expect(classifyStock(100, 60)).toBe(StockStatus.DISPONIBLE);
      expect(classifyStock(60, 60)).toBe(StockStatus.DISPONIBLE);
    });
    it('INSUFICIENTE cuando hay algo pero no basta', () => {
      expect(classifyStock(20, 60)).toBe(StockStatus.INSUFICIENTE);
    });
    it('SIN_STOCK cuando es cero o negativo', () => {
      expect(classifyStock(0, 60)).toBe(StockStatus.SIN_STOCK);
      expect(classifyStock(-5, 60)).toBe(StockStatus.SIN_STOCK);
    });
  });

  describe('canTransition', () => {
    it('permite transiciones válidas', () => {
      expect(
        canTransition(
          SalesOrderStatus.RECIBIDO,
          SalesOrderStatus.VALIDANDO_STOCK,
        ),
      ).toBe(true);
      expect(
        canTransition(
          SalesOrderStatus.CONFIRMADO,
          SalesOrderStatus.EN_PICKING,
        ),
      ).toBe(true);
    });
    it('rechaza transiciones inválidas', () => {
      expect(
        canTransition(SalesOrderStatus.RECIBIDO, SalesOrderStatus.ENTREGADO),
      ).toBe(false);
      expect(
        canTransition(SalesOrderStatus.ESPERANDO_COMPRA, SalesOrderStatus.ENTREGADO),
      ).toBe(false);
    });
    it('los estados terminales no permiten salir', () => {
      expect(
        canTransition(SalesOrderStatus.ENTREGADO, SalesOrderStatus.EN_RUTA),
      ).toBe(false);
      expect(
        canTransition(SalesOrderStatus.CANCELADO, SalesOrderStatus.RECIBIDO),
      ).toBe(false);
    });
  });
});
