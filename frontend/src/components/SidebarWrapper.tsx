'use client';

import Sidebar from './Sidebar';
import { useSidebar } from './SidebarContext';

export default function SidebarWrapper() {
  const { isMobileOpen, setIsMobileOpen, closeMobileMenu, isSidebarHidden } = useSidebar();

  // Sidebar component handles its own user fetching if passed null
  return (
    <Sidebar
      user={null}
      isMobileOpen={isMobileOpen}
      setIsMobileOpen={setIsMobileOpen}
      onMobileClose={closeMobileMenu}
      isSidebarHidden={isSidebarHidden}
    />
  );
}
