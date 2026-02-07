'use server';

import { supabaseServer } from '@/lib/supabaseServer';

interface QueueStats {
  pickingQueue: number;
  shippingQueue: number;
  completedToday: number;
}

interface GetQueueStatsResult {
  success: boolean;
  stats?: QueueStats;
  error?: string;
}

export async function getQueueStats(): Promise<GetQueueStatsResult> {
  try {
    const supabase = supabaseServer();

    // Get picking queue count
    const { count: pickingCount, error: pickingError } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'picking');

    if (pickingError) {
      console.error('Error fetching picking queue:', pickingError);
    }

    // Get shipping queue count
    const { count: shippingCount, error: shippingError } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'shipping');

    if (shippingError) {
      console.error('Error fetching shipping queue:', shippingError);
    }

    // Get completed today count (shipped today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count: completedCount, error: completedError } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'shipped')
      .gte('updated_at', todayISO);

    if (completedError) {
      console.error('Error fetching completed today:', completedError);
    }

    return {
      success: true,
      stats: {
        pickingQueue: pickingCount || 0,
        shippingQueue: shippingCount || 0,
        completedToday: completedCount || 0,
      },
    };
  } catch (error) {
    console.error('Unexpected error in getQueueStats:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}