import { supabaseServer } from './supabaseServer';
import type { OpsPickingQueueItem, OpsShippingQueueItem, Bundle, BundleItem, BundleStatus } from './types';

// =====================================================
// OPS DASHBOARD QUERIES - UPDATED FOR NEW SHIPMENTS SYSTEM
// =====================================================

export async function getPickingQueue(): Promise<OpsPickingQueueItem[]> {
  const supabase = supabaseServer();
  
  // Use the new SQL function we created
  const { data, error } = await supabase.rpc('get_picking_queue');

  if (error) {
    console.error('Error fetching picking queue:', error);
    throw error;
  }

  // Map the new structure to your existing OpsPickingQueueItem type
  return (data || []).map((item: any) => ({
    bundle_id: item.shipment_id,
    order_number: item.order_number, // Add order number
    member_id: '', // Add if needed
    status: 'picking' as BundleStatus,
    first_name: item.member_name.split(' ')[0] || item.member_name,
    last_name: item.member_name.split(' ').slice(1).join(' ') || '',
    email: '', // Add email to members table if needed
    tier: item.tier,
    ship_by: null,
    created_at: item.created_at,
    item_count: item.books_to_pick || 0,
    // Additional fields from new system
    age_group: item.age_group,
    books_to_pick: item.books_to_pick,
    books_picked: item.books_picked,
    pick_status: item.pick_status,
  }));
}

export async function getShippingQueue(): Promise<OpsShippingQueueItem[]> {
  const supabase = supabaseServer();
  
  // Query shipments with status 'shipping'
  const { data, error } = await supabase
    .from('shipments')
    .select(`
      id,
      order_number,
      member_id,
      created_at,
      shipment_date,
      status,
      notes,
      members (
        name,
        tier,
        age_group
      )
    `)
    .eq('status', 'shipping')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching shipping queue:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    bundle_id: item.id,
    order_number: item.order_number, // Add order number
    member_id: item.member_id,
    status: 'shipping' as BundleStatus,
    first_name: item.members?.name?.split(' ')[0] || '',
    last_name: item.members?.name?.split(' ').slice(1).join(' ') || '',
    email: '',
    tier: item.members?.tier || '',
    ship_by: null,
    created_at: item.created_at,
    tracking_number: null,
    item_count: 0,
  }));
}

export async function getBundleDetails(bundleId: string): Promise<{ bundle: Bundle, items: BundleItem[] }> {
  const supabase = supabaseServer();
  
  // Get shipment details
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select(`
      *,
      members (
        name,
        tier,
        age_group
      )
    `)
    .eq('id', bundleId)
    .single();

  if (shipmentError) throw shipmentError;

  // Get shipment books with pick list details
  const { data: pickList, error: pickListError } = await supabase
    .rpc('get_shipment_pick_list', { p_shipment_id: bundleId });

  if (pickListError) throw pickListError;

  // Map to old Bundle structure for UI compatibility
  const bundle: Bundle = {
    id: shipment.id,
    order_number: shipment.order_number, // Add order number
    member_id: shipment.member_id,
    status: shipment.status,
    ship_by: null,
    tracking_number: null,
    created_at: shipment.created_at,
    updated_at: shipment.updated_at,
  };

  // Map pick list to BundleItem structure
  const items: BundleItem[] = (pickList || []).map((item: any) => ({
    id: item.book_title_id,
    bundle_id: bundleId,
    child_id: null,
    sku: '',
    title: item.book_to_find.replace('📖 Find: "', '').replace('📖 "', '').split('" by ')[0].replace('"', ''),
    author: item.book_to_find.split('" by ')[1] || '',
    age_group: shipment.members?.age_group || '',
    keep_status: 'active' as const,
    keep_price: 7.00,
    cover_image_url: null,
    tags: [],
    created_at: new Date().toISOString(),
    bin_id: item.bin_id,
    bin_label: item.bin_label,
    instruction: item.instruction,
    picked: item.status === '✅ PICKED',
    scanned_at: item.scanned_at,
  }));

  return { bundle, items };
}

export async function updateBundleStatus(bundleId: string, status: 'picked' | 'shipped' | 'current'): Promise<void> {
  const supabase = supabaseServer();
  
  // Map old status names to new ones
  const statusMap: Record<string, string> = {
    'picked': 'shipping',
    'shipped': 'shipped',
    'current': 'picking',
  };
  
  const { error } = await supabase
    .from('shipments')
    .update({ status: statusMap[status] || status, updated_at: new Date().toISOString() })
    .eq('id', bundleId);

  if (error) throw error;
}

export async function assignBooksToBundle(bundleId: string, bookCopies: { sku: string, title: string, author: string, age_group: string }[]): Promise<void> {
  // This function is replaced by the automatic book matching system
  // Books are assigned when shipment is created
  const supabase = supabaseServer();
  
  const items = bookCopies.map(book => ({
    shipment_id: bundleId,
    book_title_id: book.sku,
  }));

  const { error } = await supabase
    .from('shipment_books')
    .insert(items);

  if (error) throw error;
}

export async function markBundleShipped(bundleId: string, trackingNumber: string): Promise<void> {
  const supabase = supabaseServer();
  
  const { error } = await supabase
    .from('shipments')
    .update({ 
      status: 'shipped',
      updated_at: new Date().toISOString() 
    })
    .eq('id', bundleId);

  if (error) throw error;
}

// =====================================================
// NEW FUNCTIONS FOR PHARMACY PICK SYSTEM
// =====================================================

export async function scanBook(shipmentId: string, bookTitleId: string): Promise<void> {
  const supabase = supabaseServer();
  
  const { error } = await supabase
    .from('shipment_books')
    .update({
      scanned_at: new Date().toISOString(),
      picked_at: new Date().toISOString()
    })
    .eq('shipment_id', shipmentId)
    .eq('book_title_id', bookTitleId);

  if (error) throw error;
}

export async function completeShipment(shipmentId: string): Promise<void> {
  const supabase = supabaseServer();
  
  // Check if all books are picked
  const { data: books, error: booksError } = await supabase
    .from('shipment_books')
    .select('scanned_at')
    .eq('shipment_id', shipmentId);

  if (booksError) throw booksError;

  const allPicked = books?.every(book => book.scanned_at !== null);

  if (!allPicked) {
    throw new Error('Not all books have been picked yet');
  }

  // Move to shipping
  const { error } = await supabase
    .from('shipments')
    .update({
      status: 'shipping',
      updated_at: new Date().toISOString()
    })
    .eq('id', shipmentId);

  if (error) throw error;
}