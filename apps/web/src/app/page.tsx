import { Button } from "@heroui/react";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Hello, world!</h1>
      <p className="text-muted">This is a minimal Next.js + HeroUI starter.</p>
      <Button size="lg">HeroUI Button</Button>
    </main>
  );
}
