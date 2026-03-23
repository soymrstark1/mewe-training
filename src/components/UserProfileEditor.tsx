import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Save } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfileEditorProps {
  userId: string; // auth user id
  currentName: string;
  currentAvatarUrl: string | null;
  onUpdate: (name: string, avatarUrl: string | null) => void;
  children: React.ReactNode; // trigger element
}

export default function UserProfileEditor({ userId, currentName, currentAvatarUrl, onUpdate, children }: UserProfileEditorProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 2MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error('Error al subir imagen');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    setAvatarUrl(publicUrl + '?t=' + Date.now());
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    const cleanAvatarUrl = avatarUrl?.split('?')[0] || null;

    // Update users table
    const { error } = await supabase
      .from('users')
      .update({ name: name.trim(), avatar_url: cleanAvatarUrl })
      .eq('auth_user_id', userId);

    // Also sync to teachers table if user is a teacher
    const { error: teacherSyncError } = await supabase
      .from('teachers')
      .update({ name: name.trim(), brand_name: name.trim(), avatar_url: cleanAvatarUrl })
      .eq('auth_user_id', userId);

    if (teacherSyncError) {
      console.warn('Error syncing profile to teachers table:', teacherSyncError);
      toast.warning('Perfil guardado, pero hubo un problema sincronizando con tu perfil de maestro');
    }

    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Perfil actualizado');
      onUpdate(name.trim(), cleanAvatarUrl);
      setOpen(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setName(currentName); setAvatarUrl(currentAvatarUrl); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Avatar className="h-24 w-24 border-2 border-primary/20">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name} />
              ) : null}
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          {uploading && <p className="text-xs text-muted-foreground">Subiendo...</p>}

          <div className="w-full space-y-2">
            <Label htmlFor="profile-name">Nombre</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
