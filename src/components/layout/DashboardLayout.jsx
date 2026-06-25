import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";


export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} />
      <div className={`main-content ${sidebarOpen ? "expanded" : "collapsed"}`}>
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  );
}