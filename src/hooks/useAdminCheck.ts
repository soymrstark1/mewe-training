import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminCheck() {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAcademy, setIsAcademy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (data) {
        setIsSuperadmin(data.some(r => r.role === 'superadmin'));
        setIsAdmin(data.some(r => r.role === 'admin'));
        setIsAcademy(data.some(r => r.role === 'academy'));
      }
      setIsLoading(false);
    };
    check();
  }, []);

  const hasAdminAccess = isSuperadmin || isAdmin;

  return { isSuperadmin, isAdmin, isAcademy, hasAdminAccess, isLoading };
}
