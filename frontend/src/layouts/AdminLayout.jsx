import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import TopHeader from '../components/TopHeader'
import './AdminLayout.css'

export default function AdminLayout({
  children,
  searchPlaceholder,
  pageTitle,
  pageIcon,
  headerRight,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : ''} layout-${pageTitle ? pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'default'}`}>
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="admin-layout__main">
        <TopHeader
          searchPlaceholder={searchPlaceholder}
          pageTitle={pageTitle}
          pageIcon={pageIcon}
          right={headerRight}
          toggleSidebar={toggleSidebar}
        />
        <main className="admin-layout__content">
          {children}
        </main>
      </div>
    </div>
  )
}

