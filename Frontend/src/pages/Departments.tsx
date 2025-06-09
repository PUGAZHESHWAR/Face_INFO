import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { getDepartments } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Departments: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    head_of_department: '',
  });

  useEffect(() => {
    if (currentOrganization) {
      fetchDepartments();
    }
  }, [currentOrganization]);

  const fetchDepartments = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const data = await getDepartments(currentOrganization.id);
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    try {
      const departmentData = {
        ...formData,
        organization_id: currentOrganization.id,
      };

      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update(departmentData)
          .eq('id', editingDepartment.id);
        if (error) throw error;
        toast.success('Department updated successfully');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([departmentData]);
        if (error) throw error;
        toast.success('Department created successfully');
      }

      setShowModal(false);
      setEditingDepartment(null);
      resetForm();
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save department');
    }
  };

  const handleEdit = (department: any) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name || '',
      code: department.code || '',
      description: department.description || '',
      head_of_department: department.head_of_department || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        const { error } = await supabase
          .from('departments')
          .delete()
          .eq('id', id);
        if (error) throw error;
        toast.success('Department deleted successfully');
        fetchDepartments();
      } catch (error) {
        toast.error('Failed to delete department');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      head_of_department: '',
    });
  };

  const openCreateModal = () => {
    setEditingDepartment(null);
    resetForm();
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
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => (
          <div
            key={department.id}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
                  {department.code && (
                    <p className="text-sm text-gray-600 font-mono">{department.code}</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(department)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(department.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {department.description && (
              <p className="mt-4 text-sm text-gray-600">{department.description}</p>
            )}
            
            {department.head_of_department && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Head of Department</p>
                <p className="text-sm font-medium text-gray-900">{department.head_of_department}</p>
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
              {editingDepartment ? 'Edit Department' : 'Create Department'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department Name *
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
                  Department Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., CSE, ECE, ME"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Head of Department
                </label>
                <input
                  type="text"
                  value={formData.head_of_department}
                  onChange={(e) => setFormData({ ...formData, head_of_department: e.target.value })}
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
                  {editingDepartment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;