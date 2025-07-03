import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://agptafpjmbofrcvivbac.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncHRhZnBqbWJvZnJjdml2YmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjgxMzYsImV4cCI6MjA2NTA0NDEzNn0.03c_6-NdE_I8J8zKPQl3rCW2CJv2_GAQswfOvvbuSQA';

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