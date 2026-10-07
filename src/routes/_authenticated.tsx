import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getActiveUser } from '../lib/auth';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    try {
      const user = await getActiveUser();
      if (!user || !user.is_active) {
        throw new Error('Deactivated or invalid user');
      }
      return { user };
    } catch (err) {
      throw redirect({
        to: '/auth',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen pb-12">
      <Outlet />
    </div>
  );
}
