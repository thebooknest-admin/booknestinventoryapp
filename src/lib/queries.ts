import { supabaseServer } from './supabaseServer';
import type { OpsPickingQueueItem, OpsShippingQueueItem, Bundle, BundleItem } from './types';

// =====================================================
// OPS DASHBOARD QUERIES
// =====================================================

export async function getPickingQueue(): Promise<OpsPickingQueueItem[]> {
  const supabase = supabaseServer();
  
  const { data, error } = await supabase
    .from('ops_picking_queue')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching picking queue:', error);
    throw error;
  }

  return data || [];
}

export async function getShippingQueue(): Promise<OpsShippingQueueItem[]> {
  const supabase = supabaseServer();
  
  const { data, error } = await supabase
    .from('ops_shipping_queue')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching shipping queue:', error);
    throw error;
  }

  return data || [];
}

export async function getBundleDetails(bundleId: string): Promise<{ bundle: Bundle, items: BundleItem[] }> {
  const supabase = supabaseServer();
  
  const { data: bundle, error: bundleError } = await supabase
    .from('bundles')
    .select('*')
    .eq('id', bundleId)
    .single();

  if (bundleError) throw bundleError;

  const { data: items, error: itemsError } = await supabase
    .from('bundle_items')
    .select('*')
    .eq('bundle_id', bundleId);

  if (itemsError) throw itemsError;

  return { bundle, items: items || [] };
}

export async function updateBundleStatus(bundleId: string, status: 'picked' | 'shipped' | 'current'): Promise<void> {
  const supabase = supabaseServer();
  
  const { error } = await supabase
    .from('bundles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bundleId);

  if (error) throw error;
}

export async function assignBooksToBundle(bundleId: string, bookCopies: { sku: string, title: string, author: string, age_group: string }[]): Promise<void> {
  const supabase = supabaseServer();
  
  const items = bookCopies.map(book => ({
    bundle_id: bundleId,
    sku: book.sku,
    title: book.title,
    author: book.author,
    age_group: book.age_group,
    keep_status: 'active' as const,
    keep_price: 7.00,
  }));

  const { error } = await supabase
    .from('bundle_items')
    .insert(items);

  if (error) throw error;
}

export async function markBundleShipped(bundleId: string, trackingNumber: string): Promise<void> {
  const supabase = supabaseServer();
  
  const { error } = await supabase
    .from('bundles')
    .update({ 
      status: 'shipped',
      tracking_number: trackingNumber,
      updated_at: new Date().toISOString() 
    })
    .eq('id', bundleId);

  if (error) throw error;
}