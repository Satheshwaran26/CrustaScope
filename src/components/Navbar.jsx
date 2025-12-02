import { Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import crustaLogo from '../assets/CrustaScope.png';

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center">
          <div className="flex items-center">
            <img src={crustaLogo} alt="CrustaScope Logo" className="w-20 h-20 object-contain" />
            <h1 className="ml-1 text-xl font-bold text-blue-600">CrustaScope</h1>
          </div>
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
        </div>       
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center rounded-lg p-2 space-x-2 text-lg mr-3 text-gray-500">
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span>•</span>
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout">
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
