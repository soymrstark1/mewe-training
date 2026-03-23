import { Maximize } from 'lucide-react';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useAcademyBrand } from '@/hooks/useAcademyBrand';
import defaultLogo from '@/assets/mewe-logo.png';

interface Props {
  isActive: boolean;
}

export default function WelcomeSlide({ isActive }: Props) {
  const { toggleFullscreen } = useFullscreen();
  const { brandName, subtitle, logoUrl } = useAcademyBrand();

  return (
    <div
      className="absolute inset-0 transition-all duration-[400ms]"
      style={{ opacity: isActive ? 1 : 0, visibility: isActive ? 'visible' : 'hidden' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, hsl(var(--welcome-gradient-from)), hsl(var(--welcome-gradient-to)))`,
        }}
      />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md p-3">
          <img src={logoUrl || defaultLogo} alt="Logo" className="h-full w-full object-contain" />
        </div>
        <h1 className="text-[2.5rem] font-light text-white mb-2">The Academy 🎓</h1>
        {subtitle && (
          <p className="text-lg font-light text-white/70 mb-2">{subtitle}</p>
        )}
        {brandName && (
          <p className="text-lg font-light text-white/70 mb-4">by {brandName}</p>
        )}
        <p className="text-2xl font-bold text-white">Bienvenido</p>
      </div>

      <div className="absolute left-0 right-0 text-center" style={{ bottom: 'calc(var(--safe-bottom) + 2rem)' }}>
        <p className="text-sm text-white/50">Desliza para comenzar →</p>
      </div>

      <button
        onClick={toggleFullscreen}
        className="fixed z-50 rounded-full bg-white/10 p-3 backdrop-blur-md transition-colors hover:bg-white/20"
        style={{ top: 'calc(var(--safe-top) + 1.5rem)', right: 'calc(var(--safe-right) + 1.5rem)' }}
      >
        <Maximize className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}
