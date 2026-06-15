import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { i18n } from '@/lib/db';
import { logoutAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  return (
    <div className="portal">
      <header className="portal-top">
        <div>
          <div className="pt-brand">Soi Hop · ร้านค้า</div>
          <div className="pt-shop">{i18n(acc.place_name) || acc.display_name}</div>
        </div>
        <form action={logoutAction}><button className="pt-logout" type="submit">ออกจากระบบ</button></form>
      </header>
      <nav className="portal-nav">
        <a href="/merchant">ภาพรวม</a>
        <a href="/merchant/products">สินค้า</a>
        <a href="/merchant/post">โพสต์ฟีด</a>
        <a href="/merchant/shop">ข้อมูลร้าน</a>
      </nav>
      <main className="portal-body">{children}</main>
    </div>
  );
}
