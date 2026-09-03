import Link from "next/link";
import { ArrowRight, Layers, Palette, Puzzle, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Layers,
    title: "Built-in sections",
    body: "Hero, contact, pricing, FAQ, testimonials, and more — ready to drop onto any client page.",
  },
  {
    icon: Puzzle,
    title: "Shadcn elements",
    body: "Buttons, inputs, dropdowns, cards, and badges you can nest, edit, and reorder.",
  },
  {
    icon: Palette,
    title: "Brand theming",
    body: "Set colors, fonts, radius, and a logo. Every section updates to match the client.",
  },
  {
    icon: SlidersHorizontal,
    title: "Sortable CMS",
    body: "Drag sections and elements into the story you want to tell, then publish a unique slug.",
  },
];

export default function Home() {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_#ccfbf1_0%,_#f8fafc_42%,_#fff_100%)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="text-lg font-semibold tracking-tight">Northstar CMS</div>
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/p/northstar">Live demo</Link>
          </Button>
          <Button asChild>
            <Link href="/admin">Open studio</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
          Landing page CMS for agencies
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-slate-950 md:text-7xl">
          Sell branded landing pages. Keep a CMS your clients can actually use.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Northstar is a Next.js studio for building client sites visually. Compose sections,
          theme the brand, sort the layout, and publish a live page per client.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/admin">
              Start in the studio
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/p/northstar">View a published page</Link>
          </Button>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border bg-white/80 p-6 shadow-sm backdrop-blur">
              <feature.icon className="mb-4 size-5 text-teal-700" />
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
