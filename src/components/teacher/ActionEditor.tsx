import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Upload } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SlideAction {
  id: string;
  action_type: string;
  label: string;
  emoji: string;
  url: string | null;
  is_vertical: boolean;
  sort_order: number;
  is_active: boolean;
}

const ACTION_TYPES = [
  { value: 'web', label: '🌐 Web Link' },
  { value: 'video', label: '🎬 Video' },
  { value: 'tool', label: '🔧 Herramienta' },
  { value: 'question', label: '❓ Pregunta' },
  { value: 'dashboard', label: '📊 Dashboard' },
];

/** Inline editable input that saves onBlur instead of every keystroke */
function DebouncedInput({ value, onSave, className, placeholder }: {
  value: string; onSave: (v: string) => void; className?: string; placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <Input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local); }}
      className={className}
      placeholder={placeholder}
    />
  );
}

export default function ActionEditor({ slideId }: { slideId: string }) {
  const [actions, setActions] = useState<SlideAction[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadActionId, setUploadActionId] = useState<string | null>(null);

  useEffect(() => { fetchActions(); }, [slideId]);

  const fetchActions = async () => {
    const { data } = await supabase
      .from('slide_actions')
      .select('*')
      .eq('slide_id', slideId)
      .order('sort_order', { ascending: true });
    setActions(data || []);
    setLoading(false);
  };

  const addAction = async () => {
    const nextOrder = actions.length > 0 ? Math.max(...actions.map(a => a.sort_order)) + 1 : 1;
    await supabase.from('slide_actions').insert({
      slide_id: slideId,
      label: 'Nueva acción',
      sort_order: nextOrder,
    });
    fetchActions();
  };

  const removeAction = async (id: string) => {
    await supabase.from('slide_actions').delete().eq('id', id);
    fetchActions();
  };

  const updateAction = async (id: string, field: string, value: any) => {
    await supabase.from('slide_actions').update({ [field]: value }).eq('id', id);
    fetchActions();
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadActionId) return;

    const ext = file.name.split('.').pop();
    const path = `actions/${slideId}/${uploadActionId}.${ext}`;

    const { error } = await supabase.storage
      .from('presentation-slides')
      .upload(path, file, { upsert: true });

    if (error) { toast.error('Error al subir'); return; }

    const { data: { publicUrl } } = supabase.storage
      .from('presentation-slides')
      .getPublicUrl(path);

    await updateAction(uploadActionId, 'url', `${publicUrl}?t=${Date.now()}`);
    toast.success('Media subida');
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) return <p className="text-xs text-muted-foreground">Cargando acciones...</p>;

  return (
    <div className="mt-2 space-y-2 border-t pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Acciones ({actions.length})</span>
        <Button size="icon" variant="outline" className="h-6 w-6" onClick={addAction}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />

      {actions.map(action => (
        <div key={action.id} className="space-y-1 rounded border p-2 bg-muted/50">
          <div className="flex items-center gap-1">
            <DebouncedInput
              value={action.emoji}
              onSave={v => updateAction(action.id, 'emoji', v)}
              className="h-7 w-12 text-center text-sm p-0"
            />
            <DebouncedInput
              value={action.label}
              onSave={v => updateAction(action.id, 'label', v)}
              className="h-7 text-xs flex-1"
              placeholder="Etiqueta"
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar acción "{action.label}"?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción se eliminará permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removeAction(action.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center gap-1">
            <Select value={action.action_type} onValueChange={v => updateAction(action.id, 'action_type', v)}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Switch
              checked={action.is_active}
              onCheckedChange={v => updateAction(action.id, 'is_active', v)}
            />
          </div>

          {(action.action_type === 'web' || action.action_type === 'video' || action.action_type === 'tool') && (
            <div className="flex items-center gap-1">
              <DebouncedInput
                value={action.url || ''}
                onSave={v => updateAction(action.id, 'url', v)}
                className="h-7 text-xs flex-1"
                placeholder="URL o ruta"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setUploadActionId(action.id);
                  fileRef.current?.click();
                }}
              >
                <Upload className="h-3 w-3" />
              </Button>
            </div>
          )}

          {action.action_type === 'video' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Vertical</span>
              <Switch
                checked={action.is_vertical}
                onCheckedChange={v => updateAction(action.id, 'is_vertical', v)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
