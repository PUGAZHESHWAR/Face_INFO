import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, GraduationCap, BookOpen, School, TrendingUp, Camera } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { supabase } from '../lib/supabase';

const Dashboard: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalStaff: 0,
    totalDepartments: 0,
    totalClasses: 0,
  });
  const [departmentData, setDepartmentData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization) {
      fetchDashboardData();
    }
  }, [currentOrganization]);

  const fetchDashboardData = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);

      // Fetch counts
      const [studentsRes, staffRes, departmentsRes, classesRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }).eq('organization_id', currentOrganization.id),
        supabase.from('staff').select('id', { count: 'exact' }).eq('organization_id', currentOrganization.id),
        supabase.from('departments').select('id', { count: 'exact' }).eq('organization_id', currentOrganization.id),
        supabase.from('classes').select('id', { count: 'exact' }).eq('organization_id', currentOrganization.id),
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalStaff: staffRes.count || 0,
        totalDepartments: departmentsRes.count || 0,
        totalClasses: classesRes.count || 0,
      });

      // Fetch department-wise student data
      const { data: deptData } = await supabase
        .from('departments')
        .select(`
          name,
          students (id)
        `)
        .eq('organization_id', currentOrganization.id);

      const chartData = deptData?.map(dept => ({
        name: dept.name,
        students: dept.students?.length || 0,
      })) || [];

      setDepartmentData(chartData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: GraduationCap,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      title: 'Total Staff',
      value: stats.totalStaff,
      icon: Users,
      color: 'bg-green-500',
      change: '+5%',
    },
    {
      title: 'Departments',
      value: stats.totalDepartments,
      icon: BookOpen,
      color: 'bg-purple-500',
      change: '+2%',
    },
    {
      title: 'Classes',
      value: stats.totalClasses,
      icon: School,
      color: 'bg-orange-500',
      change: '+8%',
    },
  ];

  const pieColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {currentOrganization ? `Welcome to ${currentOrganization.name}` : 'Select an organization'}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">{card.change}</span>
                  <span className="text-sm text-gray-500 ml-1">from last month</span>
                </div>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Students by Department</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="students" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="students"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <GraduationCap className="w-8 h-8 text-blue-500 mr-3" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Add New Student</div>
              <div className="text-sm text-gray-500">Register a new student</div>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="w-8 h-8 text-green-500 mr-3" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Add Staff Member</div>
              <div className="text-sm text-gray-500">Add new faculty or staff</div>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Camera className="w-8 h-8 text-purple-500 mr-3" />
            <div className="text-left">
              <div className="font-medium text-gray-900">Face Recognition</div>
              <div className="text-sm text-gray-500">Identify students and staff</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;