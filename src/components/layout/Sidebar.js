'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Chats', href: '/dashboard', icon: 'chat' },
    { name: 'Analytics', href: '/analytics', icon: 'bar_chart' },
    { name: 'Reports', href: '/reports', icon: 'description' },
    { name: 'Profile', href: '/settings', icon: 'person' },
  ];

  return (
    <aside className="md-drawer">
      <div className="md-drawer-header">
        <h2 className="text-h6" style={{ color: 'var(--md-primary)' }}>FlatSplit</h2>
      </div>
      <nav style={{ padding: '8px 0', display: 'flex', flexDirection: 'column' }}>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href !== '/' || pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className={`md-nav-item ${isActive ? 'active' : ''}`}>
              {/* Using Google Material Icons via standard ligatures */}
              <span className="material-icons md-nav-icon">{item.icon}</span>
              <span className="text-subtitle2">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
