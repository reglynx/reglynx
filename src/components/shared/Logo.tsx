import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  href?: string;
}

export function Logo({ className, size = 'md', showTagline = false, href = '/' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg', tagline: 'text-[8px]' },
    md: { icon: 'w-8 h-8', text: 'text-2xl', tagline: 'text-[9px]' },
    lg: { icon: 'w-12 h-12', text: 'text-4xl', tagline: 'text-xs' },
  };

  const content = (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2">
        {/* Lynx Eye Icon */}
        <div className={cn('relative', sizes[size].icon)}>
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Ear tufts */}
            <path d="M12 8L16 16L10 14Z" fill="#0f172a" />
            <path d="M28 8L24 16L30 14Z" fill="#0f172a" />
            {/* Eye shape (almond) */}
            <path
              d="M6 22C6 22 14 14 20 14C26 14 34 22 34 22C34 22 26 30 20 30C14 30 6 22 6 22Z"
              fill="#f59e0b"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
            {/* Pupil (vertical slit) */}
            <ellipse cx="20" cy="22" rx="2.5" ry="6" fill="#0f172a" />
            {/* Light reflection */}
            <circle cx="22" cy="19" r="1.5" fill="white" opacity="0.8" />
          </svg>
        </div>
        {/* Wordmark */}
        <span className={cn('font-bold tracking-tight', sizes[size].text)} style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-[#0f172a]">Reg</span>
          <span className="text-[#059669]">Lynx</span>
        </span>
      </div>
      {showTagline && (
        <span
          className={cn(
            'tracking-[0.25em] uppercase text-slate-400 font-medium mt-0.5 ml-1',
            sizes[size].tagline
          )}
        >
          Compliance. Always Watching.
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
