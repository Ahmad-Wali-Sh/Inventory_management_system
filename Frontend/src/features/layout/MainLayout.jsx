// The app frame: sidebar + header + the current page.
// <Outlet /> is where React Router puts the page of the current URL.
// Routes with `layout: true` in routes.config.jsx are shown inside this.
import { Outlet } from 'react-router';
import Header from './Header';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}