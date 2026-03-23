import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Upload, Image, ChevronRight, Trash2, GripVertical, Film, Globe, FileText, Play, Link, Radio, Calendar, BookOpen } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import SlideEditor from './SlideEditor';
import ExamEditor from './ExamEditor';
import FeedbackQuestionEditor from './FeedbackQuestionEditor';
import { useNavigate } from 'react-router-dom';
import { useLiveClassesEnabled } from '@/hooks/useLiveClassesEnabled';

import { Smartphone, Video } from 'lucide-react';

const CLASS_TYPES = [
  { value: 'slides', label: 'Diapositivas', emoji: '📊', desc: 'Presentación con varias diapositivas y botones de acción', icon: Image },
  { value: 'video', label: 'Video', emoji: '🎬', desc: 'Un solo video de YouTube, Vimeo o TikTok', icon: Film },
  { value: 'video_slides', label: 'Video + Diapositivas', emoji: '🎓', desc: 'Video acompañado de diapositivas con botones de acción', icon: Film },
  { value: 'tiktok_feed', label: 'Videos Cortos', emoji: '📱', desc: 'Feed vertical de videos cortos estilo TikTok', icon: Smartphone },
  { value: 'url', label: 'Página Web', emoji: '🌐', desc: 'Un enlace a una página para estudiar', icon: Globe },
  { value: 'exam', label: 'Examen', emoji: '📝', desc: 'Preguntas de opción múltiple o respuesta abierta', icon: FileText },
  { value: 'live', label: 'Clase en Vivo', emoji: '🔴', desc: 'Videollamada en vivo con chat y notas', icon: Video },
];

const getVideoThumbnail = (url: string): string | null => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  // TikTok doesn't have easy public thumbnails
  if (url.includes('tiktok.com')) return null;
  return null;
};

interface TeacherClass {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  sort_order: number;
  class_type: string;
  video_url: string | null;
  external_url: string | null;
}

export default function ClassManager({ teacherId }: { teacherId: string }) {
  const navigate = useNavigate();
  const { liveClassesEnabled } = useLiveClassesEnabled();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [slidesClassId, setSlidesClassId] = useState<string | null>(null);
  const [examClassId, setExamClassId] = useState<string | null>(null);
  const [feedbackClassId, setFeedbackClassId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherClass | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showTypeDialog, setShowTypeDialog] = useState(false);

  useEffect(() => { fetchClasses(); }, [teacherId]);

  const fetchClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('teacher_classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('sort_order', { ascending: true });
    if (!error) setClasses((data || []).map(c => ({
      ...c,
      class_type: (c as any).class_type || 'slides',
      video_url: (c as any).video_url || null,
      external_url: (c as any).external_url || null,
    })));
    setLoading(false);
  };

  const addClass = async (classType: string) => {
    const nextOrder = classes.length > 0 ? Math.max(...classes.map(c => c.sort_order)) + 1 : 1;
    const typeLabel = CLASS_TYPES.find(t => t.value === classType)?.label || 'Clase';
    const { data: newClass, error } = await supabase.from('teacher_classes').insert({
      teacher_id: teacherId,
      name: `Nueva ${typeLabel}`,
      sort_order: nextOrder,
      class_type: classType,
    } as any).select().single();
    if (error) {
      toast.error('Error al crear clase');
    } else {
      toast.success('Clase creada');
      await fetchClasses();
      if (newClass) {
        const newId = (newClass as any).id;
        if (['slides', 'video_slides', 'tiktok_feed'].includes(classType)) {
          setSlidesClassId(newId);
        } else if (classType === 'exam') {
          setExamClassId(newId);
        } else {
          // Scroll to the new card after a tick
          setTimeout(() => {
            document.getElementById(`class-card-${newId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    }
    setShowTypeDialog(false);
  };

  const updateClass = async (id: string, field: string, value: any) => {
    const { error } = await supabase.from('teacher_classes').update({ [field]: value } as any).eq('id', id);
    if (error) toast.error('Error al actualizar');
    else fetchClasses();
  };

  const deleteClass = async (cls: TeacherClass) => {
    const { error } = await supabase.from('teacher_classes').delete().eq('id', cls.id);
    if (error) toast.error('Error al eliminar clase');
    else { toast.success('Clase eliminada'); fetchClasses(); }
    setDeleteTarget(null);
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return; }
    const oldIndex = classes.findIndex(c => c.id === draggedId);
    const newIndex = classes.findIndex(c => c.id === targetId);
    if (oldIndex === -1 || newIndex === -1) { setDraggedId(null); return; }
    const reordered = [...classes];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setClasses(reordered);
    setDraggedId(null);
    const updates = reordered.map((c, i) =>
      supabase.from('teacher_classes').update({ sort_order: i }).eq('id', c.id)
    );
    await Promise.all(updates);
    fetchClasses();
  };

  const triggerUpload = (classId: string) => {
    setUploadTargetId(classId);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return; }
    const ext = file.name.split('.').pop();
    const path = `teachers/${teacherId}/classes/${uploadTargetId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('presentation-slides')
      .upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Error al subir imagen'); return; }
    const { data: { publicUrl } } = supabase.storage
      .from('presentation-slides')
      .getPublicUrl(path);
    await supabase.from('teacher_classes').update({ cover_image_url: publicUrl }).eq('id', uploadTargetId);
    toast.success('Imagen actualizada');
    fetchClasses();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Sub-views for slides, tiktok_feed and exams
  if (slidesClassId) {
    const cls = classes.find(c => c.id === slidesClassId);
    const isFeed = cls?.class_type === 'tiktok_feed';
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSlidesClassId(null)} className="gap-1">← Volver a Clases</Button>
        <h3 className="text-lg font-semibold text-foreground">{isFeed ? 'Videos Cortos' : 'Contenido'}: {cls?.name || 'Clase'}</h3>
        <SlideEditor teacherId={teacherId} classId={slidesClassId} classType={cls?.class_type} />
      </div>
    );
  }

  if (examClassId) {
    const cls = classes.find(c => c.id === examClassId);
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setExamClassId(null)} className="gap-1">← Volver a Clases</Button>
        <h3 className="text-lg font-semibold text-foreground">Examen: {cls?.name || 'Clase'}</h3>
        <ExamEditor classId={examClassId} />
      </div>
    );
  }

  if (feedbackClassId) {
    const cls = classes.find(c => c.id === feedbackClassId);
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setFeedbackClassId(null)} className="gap-1">← Volver a Clases</Button>
        <h3 className="text-lg font-semibold text-foreground">📋 Feedback: {cls?.name || 'Clase'}</h3>
        <FeedbackQuestionEditor classId={feedbackClassId} />
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Cargando clases...</p>;

  const renderClassCover = (cls: TeacherClass) => {
    switch (cls.class_type) {
      case 'video':
      case 'video_slides': {
        const thumb = cls.video_url ? getVideoThumbnail(cls.video_url) : null;
        return (
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {thumb ? (
              <>
                <img src={thumb} alt={cls.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                  <Play className="h-10 w-10 text-background drop-shadow-lg" />
                </div>
                {cls.class_type === 'video_slides' && (
                  <span className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">+ Slides</span>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Film className="h-8 w-8" />
                <span className="text-xs">Sin video aún</span>
              </div>
            )}
          </div>
        );
      }
      case 'tiktok_feed':
        return (
          <div
            className="relative aspect-video rounded-lg overflow-hidden flex flex-col items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => triggerUpload(cls.id)}
          >
            {cls.cover_image_url ? (
              <img src={cls.cover_image_url} alt={cls.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))]">
                <Smartphone className="h-12 w-12 text-primary-foreground drop-shadow-md" />
                <span className="text-sm font-bold text-primary-foreground tracking-wider uppercase drop-shadow-md">Videos Cortos</span>
              </div>
            )}
            <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
              <Upload className="h-3.5 w-3.5 text-foreground" />
            </div>
          </div>
        );
      case 'url':
        return (
          <div
            className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => triggerUpload(cls.id)}
          >
            {cls.cover_image_url ? (
              <img src={cls.cover_image_url} alt={cls.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Globe className="h-8 w-8" />
                <span className="text-xs">Click para subir portada</span>
              </div>
            )}
            <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
              <Upload className="h-3.5 w-3.5 text-foreground" />
            </div>
          </div>
        );
      case 'exam':
        return (
          <div className="relative aspect-video rounded-lg overflow-hidden flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))]">
            <FileText className="h-12 w-12 text-primary-foreground drop-shadow-md" />
            <span className="text-sm font-bold text-primary-foreground tracking-wider uppercase drop-shadow-md">Examen</span>
          </div>
        );
      case 'live':
        return (
          <div className="relative aspect-video rounded-lg overflow-hidden flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-destructive to-[hsl(var(--accent))]">
            <Video className="h-12 w-12 text-primary-foreground drop-shadow-md" />
            <span className="text-sm font-bold text-primary-foreground tracking-wider uppercase drop-shadow-md">🔴 En Vivo</span>
          </div>
        );
      default: // slides
        return (
          <div
            className="relative aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => triggerUpload(cls.id)}
          >
            {cls.cover_image_url ? (
              <img src={cls.cover_image_url} alt={cls.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Image className="h-8 w-8" />
                <span className="text-xs">Click para subir foto</span>
              </div>
            )}
            <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
              <Upload className="h-3.5 w-3.5 text-foreground" />
            </div>
          </div>
        );
    }
  };

  const renderClassControls = (cls: TeacherClass) => {
    switch (cls.class_type) {
      case 'video':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                defaultValue={cls.video_url || ''}
                placeholder="URL de YouTube o Vimeo..."
                className="h-8 text-xs"
                onBlur={e => updateClass(cls.id, 'video_url', e.target.value || null)}
                onKeyDown={e => { if (e.key === 'Enter') updateClass(cls.id, 'video_url', (e.target as HTMLInputElement).value || null); }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">Notas del maestro</span>
              </div>
              <Textarea
                defaultValue={(cls as any).teacher_notes || ''}
                placeholder="Notas de apoyo para el alumno..."
                className="text-xs min-h-[60px] resize-none"
                onBlur={e => updateClass(cls.id, 'teacher_notes', e.target.value)}
              />
            </div>
          </div>
        );
      case 'video_slides':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                defaultValue={cls.video_url || ''}
                placeholder="URL de YouTube o Vimeo..."
                className="h-8 text-xs"
                onBlur={e => updateClass(cls.id, 'video_url', e.target.value || null)}
                onKeyDown={e => { if (e.key === 'Enter') updateClass(cls.id, 'video_url', (e.target as HTMLInputElement).value || null); }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">Notas del maestro</span>
              </div>
              <Textarea
                defaultValue={(cls as any).teacher_notes || ''}
                placeholder="Notas de apoyo para el alumno..."
                className="text-xs min-h-[60px] resize-none"
                onBlur={e => updateClass(cls.id, 'teacher_notes', e.target.value)}
              />
            </div>
            <Button size="sm" variant="outline" className="gap-1 w-full" onClick={() => setSlidesClassId(cls.id)}>
              <ChevronRight className="h-3.5 w-3.5" /> Diapositivas
            </Button>
          </div>
        );
      case 'url':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                defaultValue={cls.external_url || ''}
                placeholder="URL de la página web..."
                className="h-8 text-xs"
                onBlur={e => updateClass(cls.id, 'external_url', e.target.value || null)}
                onKeyDown={e => { if (e.key === 'Enter') updateClass(cls.id, 'external_url', (e.target as HTMLInputElement).value || null); }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs">Notas del maestro</span>
              </div>
              <Textarea
                defaultValue={(cls as any).teacher_notes || ''}
                placeholder="Notas de apoyo para el alumno..."
                className="text-xs min-h-[60px] resize-none"
                onBlur={e => updateClass(cls.id, 'teacher_notes', e.target.value)}
              />
            </div>
          </div>
        );
      case 'tiktok_feed':
        return (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setSlidesClassId(cls.id)}>
            <Smartphone className="h-3.5 w-3.5" /> Videos
          </Button>
        );
      case 'exam':
        return (
          <Button size="sm" variant="outline" className="gap-1 w-full" onClick={() => setExamClassId(cls.id)}>
            <FileText className="h-3.5 w-3.5" /> Editar Examen
          </Button>
        );
      case 'live':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                defaultValue={cls.external_url || ''}
                placeholder="Nombre de sala (opcional)"
                className="h-8 text-xs"
                onBlur={e => updateClass(cls.id, 'external_url', e.target.value || null)}
                onKeyDown={e => { if (e.key === 'Enter') updateClass(cls.id, 'external_url', (e.target as HTMLInputElement).value || null); }}
              />
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                type="datetime-local"
                defaultValue={(cls as any).scheduled_date ? new Date((cls as any).scheduled_date).toISOString().slice(0, 16) : ''}
                className="h-8 text-xs"
                onBlur={e => updateClass(cls.id, 'scheduled_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>
            <Button size="sm" variant="outline" className="gap-1 w-full bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30" onClick={() => navigate(`/presentation/${teacherId}/${cls.id}`)}>
              <Radio className="h-3.5 w-3.5" /> Entrar al Estudio
            </Button>
            <p className="text-[10px] text-muted-foreground">Prueba tu cámara y controla cuándo entran los estudiantes</p>
          </div>
        );
      default: // slides
        return (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setSlidesClassId(cls.id)}>
            <ChevronRight className="h-3.5 w-3.5" /> Contenido
          </Button>
        );
    }
  };

  const getTypeBadge = (classType: string) => {
    const t = CLASS_TYPES.find(ct => ct.value === classType);
    if (!t) return null;
    return (
      <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
        {t.emoji} {t.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowTypeDialog(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Nueva Clase
        </Button>
        {liveClassesEnabled && (
          <Button onClick={() => addClass('live')} size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
            <Video className="h-4 w-4" /> Clase en Vivo
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{classes.length} clases</span>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(cls => (
          <Card
            id={`class-card-${cls.id}`}
            key={cls.id}
            className={`${!cls.is_active ? 'opacity-50' : ''} ${draggedId === cls.id ? 'opacity-30' : ''}`}
            draggable
            onDragStart={() => handleDragStart(cls.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(cls.id)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  {getTypeBadge(cls.class_type)}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(cls)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {renderClassCover(cls)}

              {editingClassId === cls.id ? (
                <Input
                  defaultValue={cls.name}
                  onBlur={e => { updateClass(cls.id, 'name', e.target.value); setEditingClassId(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { updateClass(cls.id, 'name', (e.target as HTMLInputElement).value); setEditingClassId(null); } }}
                  autoFocus
                />
              ) : (
                <p className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => setEditingClassId(cls.id)}>
                  {cls.name}
                </p>
              )}

              {editingDescId === cls.id ? (
                <Input
                  defaultValue={cls.description || ''}
                  placeholder="Descripción de la clase..."
                  onBlur={e => { updateClass(cls.id, 'description', e.target.value); setEditingDescId(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { updateClass(cls.id, 'description', (e.target as HTMLInputElement).value); setEditingDescId(null); } }}
                  autoFocus
                />
              ) : (
                <p className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-h-[1.25rem]" onClick={() => setEditingDescId(cls.id)}>
                  {cls.description || 'Click para agregar descripción...'}
                </p>
              )}

              {renderClassControls(cls)}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Feedback</span>
                  <Switch
                    checked={(cls as any).feedback_enabled || false}
                    onCheckedChange={() => updateClass(cls.id, 'feedback_enabled', !(cls as any).feedback_enabled)}
                  />
                  {(cls as any).feedback_enabled && (
                    <Button size="sm" variant="outline" className="gap-1 h-6 text-xs px-2" onClick={() => setFeedbackClassId(cls.id)}>
                      📋 Editar
                    </Button>
                  )}
                </div>
                <Switch checked={cls.is_active} onCheckedChange={() => updateClass(cls.id, 'is_active', !cls.is_active)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Type selection dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>¿Qué tipo de clase quieres crear?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {CLASS_TYPES.filter(t => liveClassesEnabled || t.value !== 'live').map(t => (
              <button
                key={t.value}
                onClick={() => addClass(t.value)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:border-primary hover:bg-accent transition-all text-center"
              >
                <span className="text-3xl">{t.emoji}</span>
                <span className="font-semibold text-foreground text-sm">{t.label}</span>
                <span className="text-xs text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar clase "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Escribe <span className="font-bold text-foreground">eliminar</span> para confirmar:</p>
            <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder='Escribe "eliminar"' autoFocus />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirmText.toLowerCase() !== 'eliminar'}
              onClick={() => { if (deleteTarget) deleteClass(deleteTarget); setDeleteConfirmText(''); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
