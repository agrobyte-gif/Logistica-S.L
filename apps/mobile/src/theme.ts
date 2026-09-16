/** Paleta y estilos compartidos (mobile-first, botones grandes §39). */
export const colors = {
  brand: '#16a34a',
  brandDark: '#15803d',
  bg: '#f5f5f4',
  card: '#ffffff',
  border: '#e7e5e4',
  text: '#1c1917',
  textMuted: '#78716c',
  danger: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
  info: '#2563eb',
};

export function statusColor(estado: string): string {
  switch (estado) {
    case 'COMPLETADO':
    case 'COMPLETADA':
    case 'OK':
    case 'PREPARADO':
    case 'ENTREGADO':
      return colors.success;
    case 'EN_PROCESO':
    case 'EN_PICKING':
    case 'EN_RUTA':
    case 'CARGANDO':
      return colors.info;
    case 'INCOMPLETO':
    case 'PICKING_INCOMPLETO':
    case 'FALTANTE':
    case 'SUSTITUCION':
      return colors.warning;
    case 'CANCELADO':
    case 'CANCELADA':
    case 'RECHAZADO':
      return colors.danger;
    default:
      return colors.textMuted;
  }
}
