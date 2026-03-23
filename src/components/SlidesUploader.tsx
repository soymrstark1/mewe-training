import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePresentationSlides } from '@/hooks/usePresentationSlides';
import { toast } from 'sonner';

interface Props {
  language: string;
}

export default function SlidesUploader({ language }: Props) {
  const { slides, loading, uploadSlide, toggleSlideActive } = usePresentationSlides(language);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSlideNumber = useRef<number>(1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato no válido. Usa JPG, PNG o WEBP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Archivo demasiado grande. Máximo 2MB');
      return;
    }

    uploadSlide(uploadSlideNumber.current, file);
    e.target.value = '';
  };

  const triggerUpload = (slideNum: number) => {
    uploadSlideNumber.current = slideNum;
    fileInputRef.current?.click();
  };

  if (loading) return <div className="text-center text-muted-foreground py-4">Cargando slides...</div>;

  const slideNumbers = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileChange} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {slideNumbers.map(num => {
          const slide = slides.find(s => s.slide_number === num);
          return (
            <div key={num} className="rounded-xl border bg-background p-2 space-y-2">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                {slide ? (
                  <img src={slide.image_url} alt={`Slide ${num}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                    Slide {num}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => triggerUpload(num)}>
                  <Upload className="h-3 w-3" />
                </Button>
                {slide && (
                  <div className="flex items-center gap-1">
                    <div className={`h-2 w-2 rounded-full ${slide.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <Switch
                      checked={slide.is_active ?? false}
                      onCheckedChange={() => toggleSlideActive(slide.id, slide.is_active ?? false)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
