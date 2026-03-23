import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Save, Camera } from 'lucide-react';

interface TeacherProfileEditorProps {
  teacherId: string;
  onProfileUpdate?: (name: string, brandName: string, avatarUrl: string | null) => void;
}

export default function TeacherProfileEditor({ teacherId, onProfileUpdate }: TeacherProfileEditorProps) {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('teachers')
      .select('name, brand_name, avatar_url')
      .eq('id', teacherId)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name);
          setBrandName(data.brand_name);
          setAvatarUrl(data.avatar_url);
        }
      });
  }, [teacherId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 2MB');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `teacher-${teacherId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Error al subir imagen');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success('Imagen subida');
    }
    setUploading(false);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    const cleanAvatarUrl = avatarUrl?.split('?')[0] || null;
    const { error } = await supabase
      .from('teachers')
      .update({ name: name.trim(), brand_name: brandName.trim(), avatar_url: cleanAvatarUrl })
      .eq('id', teacherId);

    // Also sync name + avatar to users table
    const { data: teacher } = await supabase
      .from('teachers')
      .select('auth_user_id')
      .eq('id', teacherId)
      .single();
    if (teacher) {
      await supabase
        .from('users')
        .update({ name: name.trim(), avatar_url: cleanAvatarUrl })
        .eq('auth_user_id', teacher.auth_user_id);
    }

    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Perfil actualizado');
      onProfileUpdate?.(name.trim(), brandName.trim(), cleanAvatarUrl);
    }
    setSaving(false);
  };

  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <Card>
      <CardContent className="space-y-6 py-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="h-24 w-24">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {uploading ? 'Subiendo...' : 'Clic para cambiar foto'}
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-medium text-foreground">Nombre del maestro</label>
          <Input className="mt-1" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
        </div>

        {/* Brand name */}
        <div>
          <label className="text-sm font-medium text-foreground">
            Nombre "by" (debajo del logo en la presentación)
          </label>
          <Input className="mt-1" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Nombre de marca" />
        </div>

        <Button onClick={save} disabled={saving || uploading} className="w-full gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </CardContent>
    </Card>
  );
}
