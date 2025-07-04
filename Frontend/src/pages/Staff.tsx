import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Download } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { getStaff, getDepartments, uploadFaceImage, getFaceImageUrl } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Webcam from 'react-webcam';

const Staff: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [staff, setStaff] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    phone: '',
    department_id: '',
    role: '',
    address: '',
    date_of_birth: '',
    gender: '',
  });
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faceUploadLoading, setFaceUploadLoading] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<any>(null);
  const roles = ['Admin', 'Teacher', 'Lab Assistant', 'Clerk', 'Librarian', 'Other'];
  const webcamRef = React.useRef<Webcam>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      fetchData();
    }
  }, [currentOrganization]);

  const fetchData = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const [staffData, departmentsData] = await Promise.all([
        getStaff(currentOrganization.id),
        getDepartments(currentOrganization.id),
      ]);

      setStaff(staffData);
      setDepartments(departmentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };
  const recognizeStaff = async () => {
    if (!webcamRef.current) return;
    
    setIsProcessing(true);
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (imageSrc) {
      try {
        const response = await fetch('http://localhost:5000/api/recognize-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageSrc })
        });
        
        const data = await response.json();
        
        if (data.status === 'recognized' && data.id_type === 'staff') {
          // Look up staff details from your database
          const { data: staffData, error } = await supabase
            .from('staff')
            .select('*')
            .eq('employee_id', data.identifier)
            .single();
            
          if (staffData) {
            setRecognitionResult({
              ...data,
              staff: staffData
            });
            toast.success(`Recognized staff: ${staffData.full_name}`);
          } else {
            toast.error('Staff not found in database');
          }
        } else if (data.status === 'recognized') {
          toast.error('Recognized a student, not staff');
        } else {
          toast.error(data.message || 'Recognition failed');
        }
      } catch (error) {
        toast.error('Recognition failed');
      } finally {
        setIsProcessing(false);
      }
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;
    setFaceUploadLoading(true);
    
    try {
      // First validate employee ID
      if (!formData.employee_id.trim()) {
        throw new Error('Employee ID is required before uploading face image');
      }
  
      // Upload face image if present
      if (faceFile) {
        const formDataObj = new FormData();
        formDataObj.append('face', faceFile);
        formDataObj.append('identifier', formData.employee_id);
        formDataObj.append('id_type', 'staff'); // Specify this is a staff member
        
        console.log('Submitting staff face with ID:', formData.employee_id);
  
        const uploadResponse = await fetch('http://localhost:5000/api/upload-face', {
          method: 'POST',
          body: formDataObj,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error('Upload error:', errorData);
          throw new Error(errorData.error || 'Face image upload failed');
        }
      }
      const staffData = {
        ...formData,
        organization_id: currentOrganization.id,
      };
      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update(staffData)
          .eq('id', editingStaff.id);
        if (error) throw error;
        toast.success('Staff updated successfully');
      } else {
        const { error } = await supabase
          .from('staff')
          .insert([staffData]);
        if (error) throw error;
        toast.success('Staff created successfully');
      }
      setShowModal(false);
      setEditingStaff(null);
      resetForm();
      setFaceFile(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save staff');
    } finally {
      setFaceUploadLoading(false);
    }
  };

  const handleEdit = (staffMember: any) => {
    setEditingStaff(staffMember);
    setFormData({
      employee_id: staffMember.employee_id || '',
      full_name: staffMember.full_name || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      department_id: staffMember.department_id || '',
      role: staffMember.role || '',
      address: staffMember.address || '',
      date_of_birth: staffMember.date_of_birth || '',
      gender: staffMember.gender || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const { error } = await supabase
          .from('staff')
          .delete()
          .eq('id', id);
        if (error) throw error;
        toast.success('Staff member deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete staff member');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      full_name: '',
      email: '',
      phone: '',
      department_id: '',
      role: '',
      address: '',
      date_of_birth: '',
      gender: '',
    });
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    resetForm();
    setShowModal(true);
  };

  const exportToExcel = () => {
    const exportData = staff.map(member => ({
      'Employee ID': member.employee_id,
      'Full Name': member.full_name,
      'Email': member.email,
      'Phone': member.phone,
      'Department': member.departments?.name,
      'Role': member.role,
      'Designation': member.designation,
      'Qualification': member.qualification,
      'Experience': member.experience,
      'Gender': member.gender,
      'Date of Birth': member.date_of_birth,
      'Joining Date': member.joining_date,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff');
    XLSX.writeFile(wb, `staff_${currentOrganization?.name || 'export'}.xlsx`);
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || member.department_id === filterDepartment;
    const matchesRole = !filterRole || member.role === filterRole;
    return matchesSearch && matchesDepartment && matchesRole;
  });

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
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <div className="flex space-x-3">
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-medium">
                          {member.full_name?.charAt(0) || 'S'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.full_name}
                        </div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.employee_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.departments?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(member)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Face Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setFaceFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebcam((prev) => !prev)}
                    className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                  >
                    {showWebcam ? 'Close Webcam' : 'Capture with Webcam'}
                  </button>
                  {showWebcam && (
                    <div className="mt-2 flex flex-col items-center">
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        width={220}
                        videoConstraints={{ facingMode: 'user' }}
                      />
                      <button
                        type="button"
                        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        disabled={isProcessing}
                        onClick={async () => {
                          if (!webcamRef.current) return;
                          setIsProcessing(true);
                          const imageSrc = webcamRef.current.getScreenshot();
                          if (imageSrc) {
                            // Convert base64 to Blob
                            const res = await fetch(imageSrc);
                            const blob = await res.blob();
                            const file = new File([blob], `${formData.employee_id || 'staff'}_face.jpg`, { type: 'image/jpeg' });
                            setFaceFile(file);
                            toast.success('Face image captured from webcam');
                          }
                          setIsProcessing(false);
                          setShowWebcam(false);
                        }}
                      >
                        {isProcessing ? 'Processing...' : 'Capture Photo'}
                      </button>
                    </div>
                  )}
                  {faceUploadLoading && <span className="text-xs text-blue-600">Uploading...</span>}
                  {faceFile && (
                    <div className="mt-2 text-xs text-green-600">Face image ready for upload</div>
                  )}
                </div>
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
                  {editingStaff ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {recognitionResult && (
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h2 className="text-lg font-bold mb-2">Recognition Results</h2>
          <div>
            <span className="font-medium">Type:</span> {recognitionResult.id_type}
          </div>
          <div>
            <span className="font-medium">Confidence:</span> {recognitionResult.confidence ? (recognitionResult.confidence * 100).toFixed(1) : ''}%
          </div>
          {recognitionResult.id_type === 'student' && recognitionResult.student_details ? (
            <div className="mt-2">
              <div><span className="font-medium">Name:</span> {recognitionResult.student_details.Name}</div>
              <div><span className="font-medium">Reg No:</span> {recognitionResult.student_details.Reg_No}</div>
              <div><span className="font-medium">DOB:</span> {recognitionResult.student_details.DOB}</div>
              <div><span className="font-medium">Blood Group:</span> {recognitionResult.student_details.Blood_Group}</div>
              <div><span className="font-medium">Phone:</span> {recognitionResult.student_details.Phone}</div>
              <div><span className="font-medium">Dept:</span> {recognitionResult.student_details.Dept}</div>
              <div><span className="font-medium">Gender:</span> {recognitionResult.student_details.Gender}</div>
              <div><span className="font-medium">Organization:</span> {recognitionResult.student_details.Organization}</div>
              <div><span className="font-medium">Performance:</span> {recognitionResult.student_details.Performance}</div>
              <div><span className="font-medium">Remarks:</span> {recognitionResult.student_details.Remarks}</div>
              <div><span className="font-medium">Created At:</span> {recognitionResult.student_details.Created_At}</div>
            </div>
          ) : (
            <div className="mt-2">
              <span className="font-medium">Identifier:</span> {recognitionResult.identifier}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Staff;