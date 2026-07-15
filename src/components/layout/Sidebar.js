'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Chats', href: '/dashboard', icon: 'chat_bubble' },
    { name: 'Analytics', href: '/analytics', icon: 'insert_chart' },
    { name: 'Reports', href: '/reports', icon: 'description' },
    { name: 'Profile', href: '/settings', icon: 'person' },
  ];

  return (
    <aside className="md-drawer">
      <div className="md-drawer-header">
        <h2 className="text-h6" style={{ color: 'var(--color-text)', letterSpacing: '-0.03em', margin: 0 }}>
          <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Flat</span>Split
        </h2>
      </div>
      <nav style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href !== '/' || pathname === item.href;
          return (
            <Link key={item.name} href={item.href} prefetch={false} className={`md-nav-item ${isActive ? 'active' : ''}`}>
              <span className="material-symbols-rounded md-nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
