import { CreatorSidebar } from "@/components/navigation/creator-sidebar"

export default function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <CreatorSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}