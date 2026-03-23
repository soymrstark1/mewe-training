import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function TeacherBrandEditor({ teacherId, onNameUpdate }: { teacherId: string; onNameUpdate?: (name: string) => void }) {
  const [brandName, setBrandName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('teachers')
      .select('brand_name')
      .eq('id', teacherId)
      .single()
      .then(({ data }) => {
        if (data) setBrandName(data.brand_name);
      });
  }, [teacherId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('teachers')
      .update({ brand_name: brandName })
      .eq('id', teacherId);
    if (error) toast.error('Error al guardar');
    else {
      toast.success('Nombre actualizado');
      onNameUpdate?.(brandName);
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div>
          <label className="text-sm font-medium text-foreground">
            Nombre "by" (debajo del logo en la presentación)
          </label>
          <div className="mt-2 flex gap-2">
            <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Tu nombre" />
            <Button onClick={save} disabled={saving} className="gap-1">
              <Save className="h-4 w-4" /> Guardar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
