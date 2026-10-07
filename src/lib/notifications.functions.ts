import { createServerFn } from '@tanstack/react-start';
import { getActiveUser } from './auth';
import { isSupabaseConfigured, supabase } from './supabase';
import { mockDb } from './mockDb';

export const listNotifications = createServerFn({ method: 'GET' })
  .validator((d: { page?: number; limit?: number } | undefined) => d)
  .handler(async ({ data }) => {
    const user = await getActiveUser();
    const page = data?.page || 1;
    const limit = data?.limit || 20;
    const start = (page - 1) * limit;

    if (!isSupabaseConfigured) {
      const notifs = mockDb.getNotifications();
      const total = notifs.length;
      return {
        data: notifs.slice(start, start + limit),
        total,
        page,
        limit
      };
    }

    const { data: dbData, count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(start, start + limit - 1);

    if (error) throw new Error(error.message);

    return {
      data: dbData || [],
      total: count || 0,
      page,
      limit
    };
  });

export const markRead = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const user = await getActiveUser();

    if (!isSupabaseConfigured) {
      mockDb.markNotificationRead(id);
      return { success: true };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    return { success: true };
  });
