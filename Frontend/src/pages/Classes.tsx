import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, School, Users } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { getClasses, getDepartments } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Classes: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    semester: '',
    section: '',
    academic_year: '',
    capacity: '',
    description: '',
  });

  useEffect(() => {
    if (currentOrganization) {
      fetchData();
    }
  }, [currentOrganization]);

  const fetchData = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const [classesData, departmentsData] = await Promise.all([
        getClasses(currentOrganization.id),
        getDepartments(currentOrganization.id),
      ]);

      setClasses(classesData);
      setDepartments(departmentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    try {
      const classData = {
        ...formData,
        organization_id: currentOrganization.id,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
      };

      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingClass.id);
        if (error) throw error;
        toast.success('Class updated successfully');
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([classData]);
        if (error) throw error;
        toast.success('Class created successfully');
      }

      setShowModal(false);
      setEditingClass(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save class');
    }
  };

  const handleEdit = (classItem: any) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name || '',
      code: classItem.code || '',
      department_id: classItem.department_id || '',
      semester: classItem.semester || '',
      section: classItem.section || '',
      academic_year: classItem.academic_year || '',
      capacity: classItem.capacity?.toString() || '',
      description: classItem.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        const { error } = await supabase
          .from('classes')
          .delete()
          .eq('id', id);
        if (error) throw error;
        toast.success('Class deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete class');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      department_id: '',
      semester: '',
      section: '',
      academic_year: '',
      capacity: '',
      description: '',
    });
  };

  const openCreateModal = () => {
    setEditingClass(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <School className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                  {classItem.code && (
                    <p className="text-sm text-gray-600 font-mono">{classItem.code}</p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(classItem)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(classItem.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              {classItem.departments && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Department:</span>
                  <span className="ml-2">{classItem.departments.name}</span>
                </div>
              )}
              
              {classItem.semester && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Semester:</span>
                  <span className="ml-2">{classItem.semester}</span>
                </div>
              )}
              
              {classItem.section && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Section:</span>
                  <span className="ml-2">{classItem.section}</span>
                </div>
              )}
              
              {classItem.academic_year && (
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">Academic Year:</span>
                  <span className="ml-2">{classItem.academic_year}</span>
                </div>
              )}
              
              {classItem.capacity && (
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  <span>Capacity: {classItem.capacity}</span>
                </div>
              )}
            </div>
            
            {classItem.description && (
              <p className="mt-4 text-sm text-gray-600">{classItem.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingClass ? 'Edit Class' : 'Create Class'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., BSc CS - 2nd Year - Section A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., CS2A, ECE3B"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  required
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 1st, 2nd"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., A, B, C"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 2024-25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 60"
                  />
                </div>
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
                  {editingClass ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;