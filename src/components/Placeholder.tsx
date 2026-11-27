import type { ReactNode } from 'react';

/** Temporary screen frame. Delete once a screen is built. */
export function Placeholder({ title, owner, todo, children }: { title: string; owner: 'Aditya' | 'Vedant'; todo: string[]; children?: ReactNode }) {
  return (
    <section className="p-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-xs uppercase tracking-wide text-stone-400">Placeholder · owner: {owner}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-600">
        {todo.map((t) => <li key={t}>{t}</li>)}
      </ul>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}
