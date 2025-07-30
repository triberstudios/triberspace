import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="p-8 flex flex-col gap-8">
      <h1 className="text-4xl font-semibold">Shadcn/UI Component Test</h1>
        
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-medium">Button Variants</h2>
            <div className="flex flex-wrap gap-4">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-medium">Button Sizes</h2>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🚀</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-medium">Button States</h2>
            <div className="flex flex-wrap gap-4">
              <Button>Active</Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>
        </section>
    </div>
  );
}
