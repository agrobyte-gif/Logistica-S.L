import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NAV, type NavGroup } from './nav';

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function NavRow({ group }: { group: NavGroup }) {
  const location = useLocation();
  const hasChildren = !!group.items?.length;
  const groupActive =
    group.path && location.pathname.startsWith(group.path);
  const [open, setOpen] = useState<boolean>(!!groupActive);

  // Grupo con hijos: encabezado plegable + sub-ítems.
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <span className="flex items-center gap-3">
            <span className="text-base">{group.icon}</span>
            {group.label}
          </span>
          <span className="text-xs text-neutral-400">
            {group.available ? (open ? '▾' : '▸') : 'F' + group.fase}
          </span>
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-neutral-200 pl-3 dark:border-neutral-800">
            {group.items!.map((item) =>
              item.available ? (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ) : (
                <div
                  key={item.path}
                  className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-neutral-400 dark:text-neutral-600"
                  title={`Disponible en Fase ${item.fase}`}
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] uppercase tracking-wide">
                    Fase {item.fase}
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    );
  }

  // Ítem simple disponible → enlace activo.
  if (group.available && group.path) {
    return (
      <NavLink
        to={group.path}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
          }`
        }
      >
        <span className="text-base">{group.icon}</span>
        {group.label}
      </NavLink>
    );
  }

  // Ítem simple no disponible → deshabilitado con badge de fase.
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-neutral-400 dark:text-neutral-600"
      title={`Disponible en Fase ${group.fase}`}
    >
      <span className="flex items-center gap-3">
        <span className="text-base opacity-60">{group.icon}</span>
        {group.label}
      </span>
      <span className="text-[10px] uppercase tracking-wide">
        Fase {group.fase}
      </span>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
          A
        </div>
        <div>
          <div className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
            AGROGOOD
          </div>
          <div className="text-[10px] uppercase tracking-widest text-neutral-400">
            ERP · Logística
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <NavRow key={g.label} group={g} />
        ))}
      </nav>
      <div className="border-t border-neutral-200 p-3 text-[11px] text-neutral-400 dark:border-neutral-800">
        Fase 5 · v0.1.0
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar escritorio */}
      <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:block">
        {sidebar}
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl dark:bg-neutral-900">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="hidden text-sm text-neutral-400 md:block">
            Panel de administración
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {user?.nombre ?? user?.email}
              </div>
              <div className="text-[11px] text-neutral-400">
                {user?.roles.join(', ')}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              {initials(user?.nombre ?? user?.email)}
            </div>
            <button
              onClick={() => void logout()}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
