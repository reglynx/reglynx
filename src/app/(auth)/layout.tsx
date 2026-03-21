import { Logo } from '@/components/shared/Logo';
import { FOOTER_LEGAL_LINE } from '@/lib/constants';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" showTagline />
        </div>

        {children}

        <p className="mt-8 text-center text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          {FOOTER_LEGAL_LINE}
        </p>
      </div>
    </div>
  );
}
