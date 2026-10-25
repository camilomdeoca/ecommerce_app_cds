import type { ReactNode } from "react";

type PagePlaceholderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PagePlaceholder({ title, description, children }: PagePlaceholderProps) {
  return (
    <section className="flex w-full flex-1 flex-col gap-3 p-6 sm:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-2xl text-muted">{description}</p>
      {children}
    </section>
  );
}
