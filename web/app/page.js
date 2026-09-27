import { redirect } from 'next/navigation';

// A gyoker utvonal a magyar valtozatra iranyit.
export default function RootPage() {
  redirect('/hu');
}
