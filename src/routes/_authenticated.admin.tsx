import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async ({ context }) => {
    // context inherits from parent layout route (_authenticated.tsx)
    const user = (context as any).user;
    if (!user || user.role !== 'admin') {
      throw redirect({
        to: '/dashboard',
      });
    }
    return { adminUser: user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="admin-container">
      <Outlet />
    </div>
  );
}
