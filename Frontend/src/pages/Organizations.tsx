import React, { useState } from 'react';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import toast from 'react-hot-toast';

const Organizations: React.FC = () => {
  const {
    organizations,
    currentOrganization,
    setCurrentOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    loading,
  } = useOrganization();

  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        await updateOrganization(editingOrg.id, formData);
        toast.success('Organization updated successfully');
      } else {
        await createOrganization(formData);
        toast.success('Organization created successfully');
      }
      setShowModal(false);
      setEditingOrg(null);
      setFormData({ name: '', address: '', contact: '' });
    } catch (error) {
      toast.error('Failed to save organization');
    }
  };

  const handleEdit = (org: any) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      address: org.address || '',
      contact: org.contact || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this organization?')) {
      try {
        await deleteOrganization(id);
        toast.success('Organization deleted successfully');
      } catch (error) {
        toast.error('Failed to delete organization');
      }
    }
  };

  const openCreateModal = () => {
    setEditingOrg(null);
    setFormData({ name: '', address: '', contact: '' });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <div
            key={org.id}
            className={`bg-white rounded-lg shadow-sm p-6 border-2 transition-all cursor-pointer ${
              currentOrganization?.id === org.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setCurrentOrganization(org)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                  {org.address && (
                    <p className="text-sm text-gray-600 mt-1">{org.address}</p>
                  )}
                  {org.contact && (
                    <p className="text-sm text-gray-600">{org.contact}</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(org);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(org.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {currentOrganization?.id === org.id && (
              <div className="mt-4 text-sm text-blue-600 font-medium">
                Currently Selected
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingOrg ? 'Edit Organization' : 'Create Organization'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Information
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingOrg ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;