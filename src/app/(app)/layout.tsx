import { requireUser } from "@/server/actions/auth";
import { getShopsForUser, getActiveShop } from "@/server/repositories/shops";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [shops] = await Promise.all([getShopsForUser(user.id), getActiveShop(user.id)]);

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          shops={shops.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            isActive: s.isActive,
          }))}
          user={{ name: user.name, email: user.email }}
        />
        <main className="flex-1 px-6 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
