import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  contact?: string;
  created_at: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  setCurrentOrganization: (org: Organization | null) => void;
  fetchOrganizations: () => Promise<void>;
  createOrganization: (data: Partial<Organization>) => Promise<void>;
  updateOrganization: (id: string, data: Partial<Organization>) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);

      // Set first organization as current if none selected
      if (data && data.length > 0 && !currentOrganization) {
        setCurrentOrganization(data[0]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (data: Partial<Organization>) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .insert([data]);

      if (error) throw error;
      await fetchOrganizations();
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  };

  const updateOrganization = async (id: string, data: Partial<Organization>) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      await fetchOrganizations();
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  };

  const deleteOrganization = async (id: string) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      throw error;
    }
  };

  const value = {
    organizations,
    currentOrganization,
    loading,
    setCurrentOrganization,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};