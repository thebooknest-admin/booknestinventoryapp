'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';

export type UpdateMemberPayload = {
  subscription_status: string | null;
  is_founding_flock: boolean;
  is_vip: boolean;
};

export async function updateMember(memberId: string, payload: UpdateMemberPayload) {
  const supabase = supabaseServer();

  const { error } = await supabase
    .from('members')
    .update({
      subscription_status: payload.subscription_status,
      is_founding_flock: payload.is_founding_flock,
      is_vip: payload.is_vip,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) {
    console.error('Error updating member', error);
    return { success: false as const, error: error.message };
  }

  revalidatePath('/members');
  revalidatePath('/dashboard');

  return { success: true as const };
}

export type CreateMemberPayload = {
  name: string;
  email: string;
  subscription_status: string | null;
  tier: string | null;
  age_group: string | null;
  is_founding_flock: boolean;
  is_vip: boolean;
};

export async function createMember(payload: CreateMemberPayload) {
  const supabase = supabaseServer();

  const { error, data } = await supabase
    .from('members')
    .insert({
      name: payload.name,
      email: payload.email,
      subscription_status: payload.subscription_status,
      tier: payload.tier,
      age_group: payload.age_group,
      is_founding_flock: payload.is_founding_flock,
      is_vip: payload.is_vip,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating member', error);
    return { success: false as const, error: error.message };
  }

  revalidatePath('/members');
  revalidatePath('/dashboard');

  return { success: true as const, member: data };
}
