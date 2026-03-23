import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useLiveClassesEnabled() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'live_classes_enabled')
      .maybeSingle()
      .then(({ data }) => {
        setEnabled(data?.value === 'true');
        setLoading(false);
      });
  }, []);

  return { liveClassesEnabled: enabled, loading };
}
