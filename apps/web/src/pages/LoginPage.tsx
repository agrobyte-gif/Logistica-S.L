import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const [companyRut, setCompanyRut] = useState('76123456-7');
  const [email, setEmail] = useState('admin@agrogood.cl');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [showTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({
        companyRut,
        email,
        password,
        totp: totp || undefined,
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No se pudo iniciar sesión',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 to-neutral-100 p-4 dark:from-neutral-950 dark:to-neutral-900">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-lg">
            A
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            AGROGOOD
          </h1>
          <p className="text-sm text-neutral-500">ERP · CRM · Logística</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <Field label="RUT de la empresa">
            <input
              value={companyRut}
              onChange={(e) => setCompanyRut(e.target.value)}
              className={inputClass}
              autoComplete="organization"
            />
          </Field>
          <Field label="Correo">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              autoComplete="username"
            />
          </Field>
          <Field label="Contraseña">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </Field>
          {showTotp && (
            <Field label="Código 2FA">
              <input
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                className={inputClass}
                inputMode="numeric"
                maxLength={6}
              />
            </Field>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <p className="pt-1 text-center text-[11px] text-neutral-400">
            Demo: admin@agrogood.cl · contraseña sembrada en el seed
          </p>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
