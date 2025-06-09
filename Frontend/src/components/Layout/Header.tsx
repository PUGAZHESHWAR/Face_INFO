import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';

const Header: React.FC = () => {
  const { userProfile } = useAuth();
  const { currentOrganization } = useOrganization();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {currentOrganization && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">{currentOrganization.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-gray-900">
                {userProfile?.full_name || userProfile?.email || 'User'}
              </div>
              <div className="text-gray-500 capitalize">
                {userProfile?.role || 'Admin'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;