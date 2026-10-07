import { supabase, isSupabaseConfigured } from './supabase';
import { mockDb } from './mockDb';

export interface UserSession {
  id: string;
  full_name: string;
  hospital_name: string;
  email: string;
  is_active: boolean;
  role: 'admin' | 'doctor';
}

// Fetch active user session
export async function getActiveUser(): Promise<UserSession> {
  if (!isSupabaseConfigured) {
    const mockUser = mockDb.getCurrentUser();
    return {
      id: mockUser.id,
      full_name: mockUser.full_name,
      hospital_name: mockUser.hospital_name,
      email: mockUser.email,
      is_active: mockUser.is_active,
      role: mockUser.role,
    };
  }

  // Get user session from Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  // Retrieve details from profiles table
  const { data: profile, error: dbError } = await supabase
    .from('profiles')
    .select('*, user_roles(role)')
    .eq('id', user.id)
    .single();

  if (dbError || !profile) {
    // If auth user exists but profile does not, create it
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const hospitalName = user.user_metadata?.hospital_name || '';
    
    // Attempt to insert profile
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        email: user.email || '',
        hospital_name: hospitalName,
        is_active: true
      })
      .select()
      .single();

    // Default to doctor
    await supabase.from('user_roles').insert({ user_id: user.id, role: 'doctor' }).maybeSingle();

    return {
      id: user.id,
      full_name: newProfile?.full_name || fullName,
      hospital_name: newProfile?.hospital_name || hospitalName,
      email: user.email || '',
      is_active: true,
      role: 'doctor',
    };
  }

  // Profile fields format
  const role = (profile as any).user_roles?.[0]?.role || 'doctor';
  return {
    id: user.id,
    full_name: profile.full_name,
    hospital_name: profile.hospital_name,
    email: profile.email,
    is_active: profile.is_active,
    role: role as 'admin' | 'doctor',
  };
}

// Log in
export async function signIn(email: string, password?: string): Promise<UserSession> {
  if (!isSupabaseConfigured) {
    // Simulate finding mock user
    const profs = mockDb.getProfiles();
    const existing = profs.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      mockDb.setCurrentUser(existing.id);
      return {
        id: existing.id,
        full_name: existing.full_name,
        hospital_name: existing.hospital_name,
        email: existing.email,
        is_active: existing.is_active,
        role: existing.role,
      };
    } else {
      // Auto-create in mock mode if user doesn't exist
      const mockUser = mockDb.registerUser(email, email.split('@')[0], 'Demo Clinic');
      mockDb.setCurrentUser(mockUser.id);
      return {
        id: mockUser.id,
        full_name: mockUser.full_name,
        hospital_name: mockUser.hospital_name,
        email: mockUser.email,
        is_active: mockUser.is_active,
        role: mockUser.role,
      };
    }
  }

  // Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: password || 'defaultpassword123',
  });

  if (error) {
    throw new Error(error.message);
  }

  return getActiveUser();
}

// Sign up
export async function signUp(email: string, password?: string, fullName?: string, hospitalName?: string): Promise<UserSession> {
  if (!isSupabaseConfigured) {
    const mockUser = mockDb.registerUser(email, fullName || email.split('@')[0], hospitalName || 'Demo Clinic');
    mockDb.setCurrentUser(mockUser.id);
    return {
      id: mockUser.id,
      full_name: mockUser.full_name,
      hospital_name: mockUser.hospital_name,
      email: mockUser.email,
      is_active: mockUser.is_active,
      role: mockUser.role,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: password || 'defaultpassword123',
    options: {
      data: {
        full_name: fullName,
        hospital_name: hospitalName,
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return getActiveUser();
}

// Log out
export async function signOut() {
  if (!isSupabaseConfigured) {
    return;
  }
  await supabase.auth.signOut();
}
