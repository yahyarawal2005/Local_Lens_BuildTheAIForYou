import { useState, useEffect } from 'react';
import { getProviderProfile, ProviderProfile } from '@/lib/authSession';
import { supabase } from '@/lib/supabaseClient';
import { ExperienceListing } from '@/types/experience';

/**
 * Hook to fetch authenticated provider profile and their experiences from Supabase.
 * Returns the profile, a loading flag, and the list of experiences.
 */
export function useProviderData() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [experiences, setExperiences] = useState<ExperienceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        // Fetch provider profile
        const p = await getProviderProfile();
        if (!isMounted) return;
        if (p) setProfile(p);

        // Fetch experiences belonging to this provider from Supabase
        const { data, error } = await supabase
          .from('experience')
          .select('*')
          .eq('provider_id', p?.id || '');

        if (error) {
          console.warn('Supabase experiences fetch error:', error);
          if (isMounted) setExperiences([]);
        } else if (data) {
          const exp = data as ExperienceListing[];
          if (isMounted) setExperiences(exp);
        }
      } catch (e) {
        console.error('Unexpected error in useProviderData:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  return { profile, experiences, loading };
}
