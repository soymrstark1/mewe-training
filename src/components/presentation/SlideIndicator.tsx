interface Props {
  currentStep: number;
  totalSlides: number;
}

export default function SlideIndicator({ currentStep, totalSlides }: Props) {
  if (currentStep <= 0) return null;

  return (
    <div
      className="fixed z-40 rounded-full px-3 py-2 text-xs backdrop-blur-md"
      style={{
        background: 'rgba(0,0,0,0.3)',
        color: 'hsl(var(--indicator-text) / 0.7)',
        top: 'calc(var(--safe-top) + 1.5rem)',
        left: 'calc(var(--safe-left) + 1.5rem)',
      }}
    >
      {currentStep} / {totalSlides - 1}
    </div>
  );
}
