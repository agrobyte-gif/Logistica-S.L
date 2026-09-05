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

        <Route path="/:section" element={<PlaceholderPage />} />
        <Route path="/:section/:sub" element={<PlaceholderPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
