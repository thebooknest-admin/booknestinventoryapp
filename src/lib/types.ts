// =====================================================
// SHARED TYPES - INTEGRATION CONTRACT
// =====================================================

export type BundleStatus = 'picking' | 'picked' | 'shipped' | 'current' | 'returned' | 'completed';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type OnboardingStatus = 'incomplete' | 'complete';
export type Tier = 'cozy_nest' | 'growing_nest' | 'family_nest';

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
}

export interface OpsPickingQueueItem {
  bundle_id: string;
  member_id: string;
  status: BundleStatus;
  ship_by: string | null;
  created_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  tier: Tier;
  item_count: number;
}

export interface OpsShippingQueueItem extends OpsPickingQueueItem {
  tracking_number: string | null;
}

// Helper function to get tier display name
export function getTierDisplayName(tier: Tier): string {
  const tierMap: Record<Tier, string> = {
    'cozy_nest': 'Cozy Nest',
    'growing_nest': 'Growing Nest',
    'family_nest': 'Family Nest',
  };
  return tierMap[tier];
}

// Helper function to get tier book count
export function getTierBookCount(tier: Tier): number {
  const counts: Record<Tier, number> = {
    'cozy_nest': 4,
    'growing_nest': 6,
    'family_nest': 8,
  };
  return counts[tier];
}