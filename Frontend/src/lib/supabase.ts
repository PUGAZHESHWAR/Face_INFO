import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Face recognition utilities
export const uploadFaceImage = async (file: File, userId: string, type: 'student' | 'staff') => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${type}/${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('face-images')
    .upload(fileName, file);

  if (error) throw error;
  return data;
};

export const getFaceImageUrl = (path: string) => {
  const { data } = supabase.storage
    .from('face-images')
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Database helpers
export const getStudents = async (organizationId: string) => {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      departments (name),
      classes (name)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getStaff = async (organizationId: string) => {
  const { data, error } = await supabase
    .from('staff')
    .select(`
      *,
      departments (name)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getDepartments = async (organizationId: string) => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw error;
  return data;
};

export const getClasses = async (organizationId: string) => {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      departments (name)
    `)
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw error;
  return data;
};