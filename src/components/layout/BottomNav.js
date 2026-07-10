'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Chats', href: '/dashboard', icon: 'chat' },
    { name: 'Analytics', href: '/analytics', icon: 'bar_chart' },
    { name: 'Reports', href: '/reports', icon: 'description' },
    { name: 'Profile', href: '/settings', icon: 'person' },
  ];

  return (
    <nav className="md-bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href) && item.href !== '/' || pathname === item.href;
        
        return (
          <Link key={item.name} href={item.href} className={`md-bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span className="material-icons md-bottom-nav-icon">{item.icon}</span>
            <span className="md-bottom-nav-label">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
