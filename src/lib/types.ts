// =====================================================
// SHARED TYPES - INTEGRATION CONTRACT
// =====================================================
export type BundleStatus = 'picking' | 'picked' | 'shipped' | 'current' | 'returned' | 'completed';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type OnboardingStatus = 'incomplete' | 'complete';
// Updated to support both old and new tier naming
export type Tier = 'cozy_nest' | 'growing_nest' | 'family_nest' | 'little-nest' | 'cozy-nest' | 'story-nest' | 'Little Nest' | 'Cozy Nest' | 'Story Nest';

export interface Member {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscription_status: SubscriptionStatus;
  onboarding_status: OnboardingStatus;
  tier: Tier;
  shopify_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bundle {
  id: string;
  order_number?: string; // ADD THIS LINE
  member_id: string;
  status: BundleStatus;
  ship_by: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  child_id: string | null;
  sku: string;
  title: string;
  author: string;
  age_group: string;
  keep_status: 'active' | 'keeping' | 'returning';
  keep_price: number;
  cover_image_url: string | null;
  tags: string[];
  created_at: string;
  // New fields for pharmacy pick system
  bin_id?: string;
  bin_label?: string;
  instruction?: string;
  picked?: boolean;
  scanned_at?: string | null;
}

export interface OpsPickingQueueItem {
  bundle_id: string;
  order_number?: string; // ADD THIS LINE
  member_id?: string;
  status?: BundleStatus;
  ship_by: string | null;
  created_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  tier: string; // Changed from Tier to string to be more flexible
  item_count?: number;
  // New fields from pharmacy pick system
  age_group?: string;
  books_to_pick?: number;
  books_picked?: number;
  pick_status?: string;
}

export interface OpsShippingQueueItem extends OpsPickingQueueItem {
  tracking_number: string | null;
}

// Helper function to normalize tier names
function normalizeTier(tier: string): string {
  const normalized = tier.toLowerCase().replace(/\s+/g, '-');
  return normalized;
}

// Helper function to get tier display name
export function getTierDisplayName(tier: string): string {
  const normalized = normalizeTier(tier);
  
  const tierMap: Record<string, string> = {
    'cozy-nest': 'Cozy Nest',
    'cozy_nest': 'Cozy Nest',
    'little-nest': 'Little Nest',
    'story-nest': 'Story Nest',
    'growing-nest': 'Growing Nest',
    'growing_nest': 'Growing Nest',
    'family-nest': 'Family Nest',
    'family_nest': 'Family Nest',
  };
  
  return tierMap[normalized] || tier;
}

// Helper function to get tier book count
export function getTierBookCount(tier: string): number {
  const normalized = normalizeTier(tier);
  
  const counts: Record<string, number> = {
    'cozy-nest': 6,
    'cozy_nest': 6,
    'little-nest': 4,
    'story-nest': 8,
    'growing-nest': 6,
    'growing_nest': 6,
    'family-nest': 8,
    'family_nest': 8,
  };
  
  return counts[normalized] || 6; // Default to 6
}