import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePresentationSlides(language: string = 'es') {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('presentation_slides')
      .select('*')
      .eq('language', language)
      .order('slide_number', { ascending: true });

    if (error) {
      toast.error('Error loading slides');
    } else {
      setSlides(data || []);
    }
    setLoading(false);
  }, [language]);

  useEffect(() => { fetchSlides(); }, [fetchSlides]);

  const getActiveSlideUrlMap = useCallback((): Map<number, string> => {
    const map = new Map<number, string>();
    slides.filter(s => s.is_active).forEach(s => map.set(s.slide_number, s.image_url));
    return map;
  }, [slides]);

  const uploadSlide = useCallback(async (slideNumber: number, file: File) => {
    const ext = file.name.split('.').pop();
    const path = `${language}/slide_${slideNumber}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('presentation-slides')
      .upload(path, file, { upsert: true });

    if (uploadError) { toast.error('Upload failed'); return; }

    const { data: { publicUrl } } = supabase.storage
      .from('presentation-slides')
      .getPublicUrl(path);

    const existing = slides.find(s => s.slide_number === slideNumber && s.language === language);
    if (existing) {
      await supabase.from('presentation_slides').update({ image_url: publicUrl }).eq('id', existing.id);
    } else {
      await supabase.from('presentation_slides').insert({ language, slide_number: slideNumber, image_url: publicUrl });
    }

    toast.success(`Slide ${slideNumber} uploaded`);
    fetchSlides();
  }, [language, slides, fetchSlides]);

  const toggleSlideActive = useCallback(async (id: string, isActive: boolean) => {
    await supabase.from('presentation_slides').update({ is_active: !isActive }).eq('id', id);
    fetchSlides();
  }, [fetchSlides]);

  return { slides, loading, getActiveSlideUrlMap, uploadSlide, toggleSlideActive, refetch: fetchSlides };
}
