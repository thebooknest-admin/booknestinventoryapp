'use server';

import { supabaseServer } from '@/lib/supabaseServer';

export interface OrderSummary {
  id: string;
  orderNumber: string | null;
  memberName: string | null;
  memberEmail: string | null;
  status: string | null;
  createdAt: string | null;
  total: number | null;
  itemCount: number;
}

interface GetOrdersResult {
  success: boolean;
  orders?: OrderSummary[];
  error?: string;
}

interface ShipmentRecord {
  id: string;
  order_number: string | null;
  status: string | null;
  created_at: string | null;
  members: {
    name: string | null;
    email: string | null;
  } | null;
  shipment_books: { id: string }[] | null;
}

export async function getOrders(): Promise<GetOrdersResult> {
  try {
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from('shipments')
      .select(
        `
        id,
        order_number,
        status,
        created_at,
        members (
          name,
          email
        ),
        shipment_books (
          id
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return { success: false, error: 'Failed to load orders' };
    }

    const orders = (data || []).map((record: ShipmentRecord) => ({
      id: record.id,
      orderNumber: record.order_number,
      memberName: record.members?.name || null,
      memberEmail: record.members?.email || null,
      status: record.status,
      createdAt: record.created_at,
      total: null,
      itemCount: record.shipment_books?.length ?? 0,
    }));

    return { success: true, orders };
  } catch (error) {
    console.error('Unexpected error in getOrders:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
