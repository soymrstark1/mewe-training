import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAcademyBrand() {
  const [brandName, setBrandName] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('global_settings')
        .select('key, value')
        .in('key', ['academy_brand_name', 'academy_subtitle', 'academy_logo_url']);
      if (data) {
        for (const row of data) {
          if (row.key === 'academy_brand_name') setBrandName(row.value ?? '');
          if (row.key === 'academy_subtitle') setSubtitle(row.value ?? '');
          if (row.key === 'academy_logo_url') setLogoUrl(row.value ?? '');
        }
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return { brandName, subtitle, logoUrl, loading };
}
