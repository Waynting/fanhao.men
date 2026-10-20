import { Navbar } from "@/components/navbar"
import { OnboardingDialog } from "@/components/onboarding-dialog"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-12 max-w-[1400px]">
        {children}
      </main>
      <OnboardingDialog />
    </div>
  )
}
