import { supabaseServer } from './supabaseServer';
import type { OpsPickingQueueItem, OpsShippingQueueItem, Bundle, BundleItem, BundleStatus } from './types';

type PickingQueueRpcRow = {
  shipment_id: string;
  order_number?: string | null;
  member_name?: string | null;
  tier?: string | null;
  created_at: string;
  age_group?: string | null;
  books_to_pick?: number | null;
  books_picked?: number | null;
  pick_status?: string | null;
};

type ShippingQueueMember = { name?: string | null; tier?: string | null; email?: string | null };

type ShippingQueueRow = {
  id: string;
  order_number?: string | null;
  member_id?: string | null;
  created_at: string;
  members?: ShippingQueueMember | ShippingQueueMember[] | null;
  shipment_books?: Array<{ id: string }> | null;
};

type ShipmentPickListRow = {
  book_title_id: string;
  book_to_find: string;
  bin_id?: string | null;
  bin_label?: string | null;
  instruction?: string | null;
  status?: string | null;
  scanned_at?: string | null;
};

type ShipmentDetailsMember = { name?: string | null; tier?: string | null; age_group?: string | null };
type ShipmentDetailsRow = {
  id: string;
  order_number?: string | null;
  member_id?: string | null;
  status: BundleStatus;
  created_at: string;
  updated_at: string;
  members?: ShipmentDetailsMember | ShipmentDetailsMember[] | null;
};

// Simple member row type for the Members view
export type MembersListRow = {
  id: string;
  name: string | null;
  email: string | null;
  tier: string | null;
  age_group: string | null;
  subscription_status: string | null;
  next_ship_date: string | null;
  is_founding_flock: boolean | null;
  is_vip: boolean | null;
  created_at: string;
};

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
  return ((data || []) as PickingQueueRpcRow[]).map((item) => {
    const memberName = (item.member_name || '').trim();
    const nameParts = memberName.split(' ').filter(Boolean);

    return {
      bundle_id: item.shipment_id,
      order_number: item.order_number ?? undefined, // Add order number
      member_id: '', // Add if needed
      status: 'picking' as BundleStatus,
      first_name: nameParts[0] || memberName || '',
      last_name: nameParts.slice(1).join(' ') || '',
      email: '', // Add email to members table if needed
      tier: item.tier || '',
      ship_by: null,
      created_at: item.created_at,
      item_count: item.books_to_pick || 0,
      // Additional fields from new system
      age_group: item.age_group || undefined,
      books_to_pick: item.books_to_pick || 0,
      books_picked: item.books_picked || 0,
      pick_status: item.pick_status || undefined,
    };
  });
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
        age_group,
        email
      ),
      shipment_books (
        id
      )
    `)
    .eq('status', 'shipping')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching shipping queue:', error);
    throw error;
  }

  return ((data || []) as ShippingQueueRow[]).map((item) => {
    const member = Array.isArray(item.members) ? item.members[0] : item.members;
    const memberName = (member?.name || '').trim();

    return {
      bundle_id: item.id,
      order_number: item.order_number ?? undefined, // Add order number
      member_id: item.member_id ?? undefined,
      status: 'shipping' as BundleStatus,
      first_name: memberName.split(' ')[0] || '',
      last_name: memberName.split(' ').slice(1).join(' ') || '',
      email: member?.email || '',
      tier: member?.tier || '',
      ship_by: null,
      created_at: item.created_at,
      tracking_number: null,
      item_count: item.shipment_books?.length || 0,
    };
  });
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

  const shipmentRow = shipment as ShipmentDetailsRow;
  const shipmentMember = Array.isArray(shipmentRow.members) ? shipmentRow.members[0] : shipmentRow.members;

  // Map to old Bundle structure for UI compatibility
  const bundle: Bundle = {
    id: shipmentRow.id,
    order_number: shipmentRow.order_number ?? undefined, // Add order number
    member_id: shipmentRow.member_id || '',
    status: shipmentRow.status,
    ship_by: null,
    tracking_number: null,
    created_at: shipmentRow.created_at,
    updated_at: shipmentRow.updated_at,
  };

  // Map pick list to BundleItem structure
  const items: BundleItem[] = ((pickList || []) as ShipmentPickListRow[]).map((item) => ({
    id: item.book_title_id,
    bundle_id: bundleId,
    child_id: null,
    sku: '',
    title: item.book_to_find.replace('📖 Find: "', '').replace('📖 "', '').split('" by ')[0].replace('"', ''),
    author: item.book_to_find.split('" by ')[1] || '',
    age_group: shipmentMember?.age_group || '',
    keep_status: 'active' as const,
    keep_price: 7.00,
    cover_image_url: null,
    tags: [],
    created_at: new Date().toISOString(),
    bin_id: item.bin_id ?? undefined,
    bin_label: item.bin_label ?? undefined,
    instruction: item.instruction ?? undefined,
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

export async function markBundleShipped(bundleId: string, _trackingNumber: string): Promise<void> {
  void _trackingNumber;
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

// =====================================================
// MEMBERS LIST FOR OPS DASHBOARD
// =====================================================

export async function getMembersList(): Promise<MembersListRow[]> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from('members')
    .select(
      `id, name, email, tier, age_group, subscription_status, next_ship_date, is_founding_flock, is_vip, created_at`
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching members list:', error);
    throw error;
  }

  return (data || []) as MembersListRow[];
}
