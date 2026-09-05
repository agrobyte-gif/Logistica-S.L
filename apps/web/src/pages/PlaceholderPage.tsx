import { useParams } from 'react-router-dom';

/** Página genérica para secciones que se implementan en fases posteriores. */
export function PlaceholderPage() {
  const { section } = useParams();
  const title = section
    ? section.charAt(0).toUpperCase() + section.slice(1)
    : 'Sección';

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-5xl">🚧</div>
      <h1 className="text-xl font-bold text-neutral-700 dark:text-neutral-200">
        {title}
      </h1>
      <p className="mt-2 max-w-md text-sm text-neutral-500">
        Este módulo se implementa en una fase posterior del roadmap. En la Fase 1
        está disponible el núcleo: autenticación, roles, auditoría y dashboard.
      </p>
    </div>
  );
}
