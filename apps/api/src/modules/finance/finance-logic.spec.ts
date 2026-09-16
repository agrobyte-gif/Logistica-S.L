import {
  agingStatus,
  AgingStatus,
  computeDocumentStatus,
  computeTax,
  DocumentStatus,
} from '@agrogood/shared';

describe('Lógica financiera (funciones puras)', () => {
  describe('computeTax', () => {
    it('afecto aplica 19% y redondea al peso', () => {
      expect(computeTax(150000, true)).toEqual({
        neto: 150000,
        iva: 28500,
        total: 178500,
      });
    });
    it('exento no aplica IVA', () => {
      expect(computeTax(150000, false)).toEqual({
        neto: 150000,
        iva: 0,
        total: 150000,
      });
    });
  });

  describe('computeDocumentStatus', () => {
    it('sin pagos → EMITIDA', () => {
      expect(computeDocumentStatus(1000, 0)).toBe(DocumentStatus.EMITIDA);
    });
    it('pago parcial → PAGADA_PARCIAL', () => {
      expect(computeDocumentStatus(1000, 400)).toBe(
        DocumentStatus.PAGADA_PARCIAL,
      );
    });
    it('pago total → PAGADA', () => {
      expect(computeDocumentStatus(1000, 1000)).toBe(DocumentStatus.PAGADA);
    });
  });

  describe('agingStatus', () => {
    const hoy = new Date('2026-09-16');
    it('saldo 0 → PAGADO', () => {
      expect(agingStatus(0, new Date('2026-09-01'), hoy)).toBe(
        AgingStatus.PAGADO,
      );
    });
    it('vencido → VENCIDO', () => {
      expect(agingStatus(1000, new Date('2026-09-10'), hoy)).toBe(
        AgingStatus.VENCIDO,
      );
    });
    it('por vencer dentro de 5 días → POR_VENCER', () => {
      expect(agingStatus(1000, new Date('2026-09-19'), hoy)).toBe(
        AgingStatus.POR_VENCER,
      );
    });
    it('lejano → VIGENTE', () => {
      expect(agingStatus(1000, new Date('2026-10-30'), hoy)).toBe(
        AgingStatus.VIGENTE,
      );
    });
  });
});
