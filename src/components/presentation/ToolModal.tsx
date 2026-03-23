import { X } from 'lucide-react';

interface Props {
  url: string;
  onClose: () => void;
}

export default function ToolModal({ url, onClose }: Props) {
  // External URLs open in new window
  if (url.startsWith('https://') || url.startsWith('http://')) {
    window.open(url, '_blank');
    onClose();
    return null;
  }

  const iframeUrl = url.includes('?') ? `${url}&embed=1` : `${url}?embed=1`;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
    >
      <div className="relative h-[90%] w-[95%] max-w-6xl rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'hsl(var(--modal-container-bg))' }}>
        <button
          onClick={onClose}
          className="absolute z-10 rounded-full p-2 transition-colors hover:bg-black/30"
          style={{ background: 'rgba(0,0,0,0.5)', top: 'calc(var(--safe-top) + 1rem)', right: 'calc(var(--safe-right) + 1rem)' }}
        >
          <X className="h-5 w-5 text-white" />
        </button>
        <iframe src={iframeUrl} className="h-full w-full border-0" title="Tool" />
      </div>
    </div>
  );
}
