import { Logo } from '@/components/shared/Logo';
import { FOOTER_LEGAL_LINE } from '@/lib/constants';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b px-6 py-4">
        <Logo size="sm" />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">{children}</div>
      </main>

      <footer className="border-t px-6 py-4">
        <p className="text-center text-xs text-slate-400 leading-relaxed">
          {FOOTER_LEGAL_LINE}
        </p>
      </footer>
    </div>
  );
}
