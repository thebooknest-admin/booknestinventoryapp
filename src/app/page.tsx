import { redirect } from 'next/navigation';

export default function Home() {
  // Simple root redirect: let auth logic handle whether this lands
  // on /dashboard or bounces the user to /login.
  redirect('/dashboard');
}
