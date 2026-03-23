import { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSuperadminCheck } from '@/hooks/useSuperadminCheck';
import SlidesUploader from '@/components/SlidesUploader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function SuperadminPanel() {
  const { isSuperadmin, isLoading } = useSuperadminCheck();
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [togglingLive, setTogglingLive] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: brand } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'academy_brand_name')
        .maybeSingle();
      if (brand?.value) setBrandName(brand.value);

      const { data: live } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', 'live_classes_enabled')
        .maybeSingle();
      setLiveEnabled(live?.value === 'true');
    };
    load();
  }, []);

  const saveBrandName = async () => {
    setSavingBrand(true);
    const { error } = await supabase
      .from('global_settings')
      .update({ value: brandName, updated_at: new Date().toISOString() })
      .eq('key', 'academy_brand_name');
    if (error) toast.error('Error al guardar');
    else toast.success('Nombre actualizado');
    setSavingBrand(false);
  };

  const toggleLiveClasses = async (checked: boolean) => {
    setTogglingLive(true);
    setLiveEnabled(checked);
    const { error } = await supabase
      .from('global_settings')
      .update({ value: checked ? 'true' : 'false', updated_at: new Date().toISOString() })
      .eq('key', 'live_classes_enabled');
    if (error) { toast.error('Error al guardar'); setLiveEnabled(!checked); }
    else toast.success(checked ? 'Clases en Vivo activadas' : 'Clases en Vivo desactivadas');
    setTogglingLive(false);
  };

  if (isLoading || !isSuperadmin) return null;

  return (
    <Collapsible className="rounded-2xl border bg-card p-4">
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-left">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <span className="font-semibold text-foreground">Panel de Administración</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 space-y-4">
        {/* Live classes toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">🔴 Clases en Vivo (Jitsi)</p>
            <p className="text-xs text-muted-foreground">Activar videollamadas para maestros</p>
          </div>
          <Switch checked={liveEnabled} onCheckedChange={toggleLiveClasses} disabled={togglingLive} />
        </div>

        {/* Brand name editor */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nombre "by" (debajo del logo)</label>
          <div className="flex gap-2">
            <Input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="Ej: Mauricio Trachtman"
            />
            <Button size="sm" onClick={saveBrandName} disabled={savingBrand}>
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
          </div>
        </div>

        {/* Slides uploader */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={selectedLang === 'es' ? 'default' : 'outline'}
            className={selectedLang === 'es' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            onClick={() => setSelectedLang(selectedLang === 'es' ? null : 'es')}
          >
            🇪🇸 Diapositivas ES
          </Button>
          <Button
            variant={selectedLang === 'en' ? 'default' : 'outline'}
            className={selectedLang === 'en' ? 'bg-pink-600 hover:bg-pink-700' : ''}
            onClick={() => setSelectedLang(selectedLang === 'en' ? null : 'en')}
          >
            🇬🇧 Diapositivas EN
          </Button>
        </div>
        {selectedLang && <SlidesUploader language={selectedLang} />}
      </CollapsibleContent>
    </Collapsible>
  );
}
