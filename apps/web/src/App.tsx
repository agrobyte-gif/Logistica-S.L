import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ClientesPage } from './pages/ClientesPage';
import { ProductosPage } from './pages/ProductosPage';
import { ProveedoresPage } from './pages/ProveedoresPage';
import { NecesidadesPage } from './pages/NecesidadesPage';
import { PedidosPage } from './pages/PedidosPage';
import { NuevoPedidoPage } from './pages/NuevoPedidoPage';
import { PedidoDetailPage } from './pages/PedidoDetailPage';
import { StockPage } from './pages/StockPage';
import { MovimientosPage } from './pages/MovimientosPage';
import { MermasPage } from './pages/MermasPage';
import { OrdenesCompraPage } from './pages/OrdenesCompraPage';
import { NuevaOCPage } from './pages/NuevaOCPage';
import { OCDetailPage } from './pages/OCDetailPage';
import { PickingPage } from './pages/PickingPage';
import { PickingDetailPage } from './pages/PickingDetailPage';
import { DespachoPage } from './pages/DespachoPage';
import { RutasPage } from './pages/RutasPage';
import { RutaDetailPage } from './pages/RutaDetailPage';
import { VehiculosPage } from './pages/VehiculosPage';
import { ConductoresPage } from './pages/ConductoresPage';
import { EntregasPage } from './pages/EntregasPage';
import { GpsPage } from './pages/GpsPage';
import { NotificacionesPage } from './pages/NotificacionesPage';
import { CajaPage } from './pages/CajaPage';
import { FacturacionPage } from './pages/FacturacionPage';
import { CuentasCobrarPage } from './pages/CuentasCobrarPage';
import { CuentasPagarPage } from './pages/CuentasPagarPage';
import { ControlTowerPage } from './pages/ControlTowerPage';
import { ReportesPage } from './pages/ReportesPage';
import { InteligenciaPage } from './pages/InteligenciaPage';
import { Layout } from './components/Layout';

function FullScreenLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="text-neutral-500">Cargando…</div>
    </div>
  );
}

export function App() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Fase 2 */}
        <Route path="/crm/clientes" element={<ClientesPage />} />
        <Route path="/ventas/pedidos" element={<PedidosPage />} />
        <Route path="/ventas/pedidos/nuevo" element={<NuevoPedidoPage />} />
        <Route path="/ventas/pedidos/:id" element={<PedidoDetailPage />} />
        <Route path="/ventas/productos" element={<ProductosPage />} />
        <Route path="/compras/proveedores" element={<ProveedoresPage />} />
        <Route path="/compras/necesidades" element={<NecesidadesPage />} />

        {/* Fase 3 */}
        <Route path="/bodega/stock" element={<StockPage />} />
        <Route path="/bodega/movimientos" element={<MovimientosPage />} />
        <Route path="/mermas" element={<MermasPage />} />
        <Route path="/compras/ordenes" element={<OrdenesCompraPage />} />
        <Route path="/compras/ordenes/nueva" element={<NuevaOCPage />} />
        <Route path="/compras/ordenes/:id" element={<OCDetailPage />} />

        {/* Fase 4 */}
        <Route path="/bodega/picking" element={<PickingPage />} />
        <Route path="/bodega/picking/:id" element={<PickingDetailPage />} />
        <Route path="/logistica/despacho" element={<DespachoPage />} />
        <Route path="/logistica/rutas" element={<RutasPage />} />
        <Route path="/logistica/rutas/:id" element={<RutaDetailPage />} />
        <Route path="/logistica/vehiculos" element={<VehiculosPage />} />
        <Route path="/logistica/conductores" element={<ConductoresPage />} />

        {/* Fase 5 */}
        <Route path="/logistica/entregas" element={<EntregasPage />} />
        <Route path="/logistica/gps" element={<GpsPage />} />
        <Route path="/notificaciones" element={<NotificacionesPage />} />

        {/* Fase 6 */}
        <Route path="/finanzas/caja" element={<CajaPage />} />
        <Route path="/finanzas/cxc" element={<CuentasCobrarPage />} />
        <Route path="/finanzas/cxp" element={<CuentasPagarPage />} />
        <Route path="/facturacion" element={<FacturacionPage />} />

        {/* Fase 7 */}
        <Route path="/control-tower" element={<ControlTowerPage />} />
        <Route path="/reportes" element={<ReportesPage />} />

        {/* Fase 8 */}
        <Route path="/inteligencia" element={<InteligenciaPage />} />

        <Route path="/:section" element={<PlaceholderPage />} />
        <Route path="/:section/:sub" element={<PlaceholderPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
