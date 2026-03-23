import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, Settings2, Image, Film, ExternalLink, X, CheckCircle2, Link, Play, AlertTriangle, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ActionEditor from './ActionEditor';
import { Textarea } from '@/components/ui/textarea';

const getVideoThumbnail = (url: string): string | null => {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  return null;
};

const CONTENT_TYPES = [
  { value: 'slide', label: 'Diapositiva', icon: Image },
  { value: 'video_link', label: 'Video (URL)', icon: Film },
  { value: 'external_link', label: 'Enlace externo', icon: ExternalLink },
];

interface Slide {
  id: string;
  slide_number: number;
  language: string;
  media_url: string | null;
  media_type: string;
  is_active: boolean;
  sort_order: number;
  title: string;
  content_type: string;
  thumbnail_url: string | null;
  teacher_notes: string;
}

const isTikTokUrl = (url: string) => /tiktok\.com|vm\.tiktok\.com/.test(url || '');

export default function SlideEditor({ teacherId, classId, classType }: { teacherId: string; classId?: string; classType?: string }) {
  const isFeedMode = classType === 'tiktok_feed';
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [language, setLanguage] = useState('es');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [thumbnailTarget, setThumbnailTarget] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const titleDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const urlDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const notesDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const markSaved = () => {
    setLastSaved(Date.now());
    setTimeout(() => setLastSaved(null), 3000);
  };

  useEffect(() => { fetchSlides(); }, [teacherId, classId, language]);

  const fetchSlides = async () => {
    setLoading(true);
    let query = supabase
      .from('teacher_slides')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('language', language);
    if (classId) query = query.eq('class_id', classId);
    else query = query.is('class_id', null);
    const { data, error } = await query.order('slide_number', { ascending: true });

    if (!error) setSlides((data || []).map(s => ({ ...s, content_type: (s as any).content_type || 'slide', thumbnail_url: (s as any).thumbnail_url || null, teacher_notes: (s as any).teacher_notes || '' })));
    setLoading(false);
  };

  const insertSlideAt = async (position: number) => {
    // Shift all slides at position >= insertPos in reverse order
    const toShift = slides.filter(s => s.slide_number >= position).sort((a, b) => b.slide_number - a.slide_number);
    for (const s of toShift) {
      await supabase.from('teacher_slides')
        .update({ slide_number: s.slide_number + 1, sort_order: s.slide_number + 1 })
        .eq('id', s.id);
    }
    // Insert new slide at position
    const { error } = await supabase.from('teacher_slides').insert({
      teacher_id: teacherId,
      class_id: classId || null,
      slide_number: position,
      language,
      sort_order: position,
      ...(isFeedMode ? { content_type: 'video_link' } : {}),
    });
    if (error) toast.error('Error al agregar diapositiva');
    else { fetchSlides(); markSaved(); }
  };

  const addSlide = async () => {
    const nextNum = slides.length > 0 ? Math.max(...slides.map(s => s.slide_number)) + 1 : 1;
    await insertSlideAt(nextNum);
  };

  const deleteSlide = async (slide: Slide) => {
    await supabase.from('slide_actions').delete().eq('slide_id', slide.id);
    await supabase.from('teacher_slides').delete().eq('id', slide.id);

    const remaining = slides.filter(s => s.id !== slide.id);
    for (let i = 0; i < remaining.length; i++) {
      const newNum = i + 1;
      if (remaining[i].slide_number !== newNum) {
        await supabase.from('teacher_slides').update({ slide_number: newNum, sort_order: newNum }).eq('id', remaining[i].id);
      }
    }

    if (editingSlideId === slide.id) setEditingSlideId(null);
    toast.success('Diapositiva eliminada');
    fetchSlides();
    markSaved();
  };

  const clearMedia = async (slideId: string) => {
    await supabase.from('teacher_slides').update({ media_url: null, media_type: 'image' }).eq('id', slideId);
    toast.success('Imagen eliminada');
    fetchSlides();
    markSaved();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('teacher_slides').update({ is_active: !current }).eq('id', id);
    fetchSlides();
    markSaved();
  };

  const updateContentType = async (slideId: string, newType: string) => {
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, content_type: newType } : s));
    await supabase.from('teacher_slides').update({ content_type: newType }).eq('id', slideId);
    markSaved();
  };

  const handleTitleChange = useCallback((slideId: string, newTitle: string) => {
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, title: newTitle } : s));
    if (titleDebounceRefs.current[slideId]) clearTimeout(titleDebounceRefs.current[slideId]);
    titleDebounceRefs.current[slideId] = setTimeout(async () => {
      await supabase.from('teacher_slides').update({ title: newTitle }).eq('id', slideId);
      markSaved();
    }, 800);
  }, []);

  const handleUrlChange = useCallback((slideId: string, newUrl: string) => {
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, media_url: newUrl } : s));
    if (urlDebounceRefs.current[slideId]) clearTimeout(urlDebounceRefs.current[slideId]);
    urlDebounceRefs.current[slideId] = setTimeout(async () => {
      await supabase.from('teacher_slides').update({ media_url: newUrl || null }).eq('id', slideId);
      markSaved();
    }, 800);
  }, []);

  const handleNotesChange = useCallback((slideId: string, newNotes: string) => {
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, teacher_notes: newNotes } : s));
    if (notesDebounceRefs.current[slideId]) clearTimeout(notesDebounceRefs.current[slideId]);
    notesDebounceRefs.current[slideId] = setTimeout(async () => {
      await supabase.from('teacher_slides').update({ teacher_notes: newNotes } as any).eq('id', slideId);
      markSaved();
    }, 800);
  }, []);

  const triggerUpload = (slideId: string) => {
    setUploadTarget(slideId);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      toast.error('Solo se permiten imágenes o videos');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Archivo demasiado grande (máx 50MB)');
      return;
    }

    const slide = slides.find(s => s.id === uploadTarget);
    if (!slide) return;

    const ext = file.name.split('.').pop();
    const path = `teachers/${teacherId}/${language}/slide_${slide.slide_number}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('presentation-slides')
      .upload(path, file, { upsert: true });

    if (uploadError) { toast.error('Error al subir archivo'); return; }

    const { data: { publicUrl } } = supabase.storage
      .from('presentation-slides')
      .getPublicUrl(path);

    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    await supabase.from('teacher_slides').update({
      media_url: urlWithCacheBust,
      media_type: isVideo ? 'video' : 'image',
    }).eq('id', uploadTarget);

    toast.success('Archivo subido correctamente');
    fetchSlides();
    markSaved();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerThumbnailUpload = (slideId: string) => {
    setThumbnailTarget(slideId);
    thumbnailInputRef.current?.click();
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !thumbnailTarget) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Máx 10MB'); return; }

    const slide = slides.find(s => s.id === thumbnailTarget);
    if (!slide) return;

    const ext = file.name.split('.').pop();
    const path = `teachers/${teacherId}/${language}/thumb_${slide.slide_number}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('presentation-slides')
      .upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Error al subir thumbnail'); return; }

    const { data: { publicUrl } } = supabase.storage
      .from('presentation-slides')
      .getPublicUrl(path);

    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
    await supabase.from('teacher_slides').update({ thumbnail_url: urlWithCacheBust }).eq('id', thumbnailTarget);
    setSlides(prev => prev.map(s => s.id === thumbnailTarget ? { ...s, thumbnail_url: urlWithCacheBust } : s));
    toast.success('Thumbnail subido');
    markSaved();
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const clearThumbnail = async (slideId: string) => {
    await supabase.from('teacher_slides').update({ thumbnail_url: null }).eq('id', slideId);
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, thumbnail_url: null } : s));
    toast.success('Thumbnail eliminado');
    markSaved();
  };

  const getContentIcon = (type: string) => {
    const ct = CONTENT_TYPES.find(c => c.value === type);
    if (!ct) return <Image className="h-4 w-4" />;
    const Icon = ct.icon;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) return <p className="text-muted-foreground">Cargando diapositivas...</p>;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Language selector */}
        <div className="flex gap-2">
          <Button variant={language === 'es' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('es')}>
            🇪🇸 Español
          </Button>
          <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLanguage('en')}>
            🇬🇧 English
          </Button>
        </div>

        {/* Add slide */}
        <div className="flex items-center gap-3">
          <Button onClick={addSlide} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Agregar Contenido
          </Button>
          <span className="text-sm text-muted-foreground">{slides.length} elementos</span>
          {lastSaved && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-300">
              <CheckCircle2 className="h-4 w-4" /> Guardado
            </span>
          )}
        </div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
        <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />

        {/* Slides grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {slides.map((slide) => (
            <Card key={slide.id} className={`${!slide.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-3 space-y-2">
                  {/* Insert before/after buttons */}
                  <div className="flex gap-1 justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-0.5" onClick={() => insertSlideAt(slide.slide_number)}>
                          <ChevronLeft className="h-3 w-3" /><Plus className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Insertar antes</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-0.5" onClick={() => insertSlideAt(slide.slide_number + 1)}>
                          <Plus className="h-3 w-3" /><ChevronRight className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Insertar después</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Content type selector (hidden in feed mode) */}
                  {!isFeedMode && (
                    <Select value={slide.content_type} onValueChange={(v) => updateContentType(slide.id, v)}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map(ct => (
                          <SelectItem key={ct.value} value={ct.value} className="text-xs">
                            {ct.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Media area - changes based on content_type */}
                  {slide.content_type === 'slide' ? (
                    <div
                      className="relative aspect-video bg-muted rounded overflow-hidden flex items-center justify-center cursor-pointer group"
                      onClick={() => triggerUpload(slide.id)}
                    >
                      {slide.media_url ? (
                        slide.media_type === 'video' ? (
                          <div className="flex flex-col items-center gap-1">
                            <Film className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Video</span>
                          </div>
                        ) : (
                          <img src={slide.media_url} alt={`Slide ${slide.slide_number}`} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Upload className="h-6 w-6" />
                          <span className="text-xs">Subir imagen</span>
                        </div>
                      )}

                      <span className="absolute top-1 left-1 bg-foreground/80 text-background text-xs px-1.5 py-0.5 rounded font-bold">
                        {slide.slide_number}
                      </span>

                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                        <Upload className="h-6 w-6 text-background opacity-0 group-hover:opacity-70 transition-opacity" />
                      </div>

                      {slide.media_url && (
                        <button
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); clearMedia(slide.id); }}
                          title="Quitar imagen"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      className="relative aspect-video bg-muted rounded overflow-hidden flex flex-col items-center justify-center gap-1 p-2 cursor-pointer group"
                      onClick={() => isFeedMode ? triggerThumbnailUpload(slide.id) : undefined}
                    >
                      <span className="absolute top-1 left-1 bg-foreground/80 text-background text-xs px-1.5 py-0.5 rounded font-bold z-10">
                        {slide.slide_number}
                      </span>
                      {slide.thumbnail_url ? (
                        <>
                          <img src={slide.thumbnail_url} alt="Thumbnail" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                            <Play className="h-8 w-8 text-background drop-shadow-lg" />
                          </div>
                          <button
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => { e.stopPropagation(); clearThumbnail(slide.id); }}
                            title="Quitar thumbnail"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : slide.content_type === 'video_link' && slide.media_url && getVideoThumbnail(slide.media_url) ? (
                        <>
                          <img src={getVideoThumbnail(slide.media_url)!} alt="Video thumbnail" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                            <Play className="h-8 w-8 text-background drop-shadow-lg" />
                          </div>
                        </>
                      ) : isFeedMode ? (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Upload className="h-6 w-6" />
                          <span className="text-xs">Subir portada</span>
                        </div>
                      ) : slide.content_type === 'video_link' ? (
                        <>
                          <Film className="h-8 w-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Video URL</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-8 w-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Enlace</span>
                        </>
                      )}
                      {isFeedMode && (
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                          <Upload className="h-6 w-6 text-background opacity-0 group-hover:opacity-70 transition-opacity" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* URL input for video_link and external_link */}
                  {(slide.content_type === 'video_link' || slide.content_type === 'external_link') && (
                    <>
                      <div className="flex items-center gap-1">
                        <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={slide.media_url || ''}
                          onChange={e => handleUrlChange(slide.id, e.target.value)}
                          placeholder={slide.content_type === 'video_link' ? 'URL de YouTube o Vimeo...' : 'URL del enlace...'}
                          className="h-7 text-xs"
                        />
                      </div>
                      {isFeedMode && slide.media_url && isTikTokUrl(slide.media_url) && (
                        <div className="flex items-start gap-1.5 p-2 rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[10px] leading-tight text-amber-800 dark:text-amber-300">
                            Los videos de TikTok no se reproducen en móviles. Usa YouTube Shorts, Vimeo o YouTube.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Title input */}
                  <Input
                    value={slide.title}
                    onChange={e => handleTitleChange(slide.id, e.target.value)}
                    placeholder="Título..."
                    className="h-7 text-xs"
                    maxLength={100}
                  />

                  {/* Teacher notes */}
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <BookOpen className="h-3 w-3" /> Notas del maestro
                    </label>
                    <Textarea
                      value={slide.teacher_notes}
                      onChange={e => handleNotesChange(slide.id, e.target.value)}
                      placeholder="Notas de apoyo para el alumno..."
                      className="text-xs min-h-[60px] resize-y"
                    />
                  </div>

                  {/* Action buttons row */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingSlideId(editingSlideId === slide.id ? null : slide.id)}>
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Acciones</TooltipContent>
                      </Tooltip>

                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar elemento {slide.slide_number}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará el contenido y todas sus acciones. Los elementos restantes se renumerarán automáticamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteSlide(slide)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <Switch
                      checked={slide.is_active}
                      onCheckedChange={() => toggleActive(slide.id, slide.is_active)}
                    />
                  </div>

                  {editingSlideId === slide.id && (
                    <ActionEditor slideId={slide.id} />
                  )}
                </CardContent>
              </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
