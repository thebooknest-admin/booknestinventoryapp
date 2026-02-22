import { getMembersList } from '@/lib/queries';
import MembersClient from './MembersClient';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const initialMembers = await getMembersList();
    return <MembersClient initialMembers={initialMembers} />;
}