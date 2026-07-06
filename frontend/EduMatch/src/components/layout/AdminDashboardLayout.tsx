import { Outlet } from "react-router-dom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export function AdminDashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B] text-zinc-200 font-sans selection:bg-[#8b5cf6]/30 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#8b5cf6]/5 blur-[150px] rounded-full pointer-events-none z-0" />
      <AdminSidebar />
      <main className="flex-1 flex flex-col h-full relative z-10 overflow-hidden isolate">
        <div className="flex-1 overflow-y-auto bg-[#09090B]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
