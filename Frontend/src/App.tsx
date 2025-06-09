import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { OrganizationProvider } from './context/OrganizationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Students from './pages/Students';
import Staff from './pages/Staff';
import Departments from './pages/Departments';
import Classes from './pages/Classes';
import FaceRecognition from './pages/FaceRecognition';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <Router>
          <div className="App">
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="organizations" element={<Organizations />} />
                <Route path="students" element={<Students />} />
                <Route path="staff" element={<Staff />} />
                <Route path="departments" element={<Departments />} />
                <Route path="classes" element={<Classes />} />
                <Route path="face-recognition" element={<FaceRecognition />} />
                <Route path="settings" element={<Settings />} />
                <Route path="" element={<Navigate to="/dashboard\" replace />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;