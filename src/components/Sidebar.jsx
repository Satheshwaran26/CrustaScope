import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Camera, 
  FileText, 
  Settings,
  X
} from 'lucide-react';
import crustaLogo from '../assets/CrustaScope.png';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Camera Live Feed', href: '/camera', icon: Camera },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Sidebar */}
      <div
        className={`${isOpen ? "translate-x-0" : "-translate-x-full"}
          fixed lg:static lg:translate-x-0 z-30 top-0 left-0 w-64 h-full 
          bg-white border-r border-gray-200
          transition-transform duration-300
          lg:h-auto
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <img src={crustaLogo} alt="CrustaScope Logo" className="w-8 h-8" />
              <h1 className="ml-2 text-lg font-semibold text-gray-900">
                CrustaScope
              </h1>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center px-3 py-2.5 text-lg font-normal rounded-lg
                    transition-colors
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  `}
                >
                  <Icon
                    className={`
                      mr-3 h-5 w-5
                      ${isActive ? "text-blue-600" : "text-gray-400"}
                    `}
                  />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Status Section */}
         <div className="px-3 py-4 border-t border-gray-200">
  <div className="flex items-center justify-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 text-md text-gray-600">
    <span className="font-medium">Version:</span>
    <span className="ml-1">1.0.0v</span>
  </div>
</div>

        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;
