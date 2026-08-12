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
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-layout__main">
        <TopHeader
          searchPlaceholder={searchPlaceholder}
          pageTitle={pageTitle}
          pageIcon={pageIcon}
          right={headerRight}
        />
        <main className="admin-layout__content">
          {children}
        </main>
      </div>
    </div>
  )
}
