import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiSearch, FiUser, FiLogOut, FiLink } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4 w-full">
        <div className="flex flex-nowrap justify-between items-center h-16 min-w-0 gap-2 w-full overflow-x-hidden overflow-y-hidden whitespace-nowrap px-0" style={{maxWidth:'100vw'}}>
          <Link to="/" className="flex flex-col items-center justify-center">
            <div className="flex flex-col items-center">
              <FiLink 
                className="w-24 h-7 text-gray-400 -mb-1.5"
                style={{ transform: 'rotate(45deg)' }}
              />
              <span className="text-2xl font-bold text-primary tracking-tight leading-none">Link</span>
              <span
                className="block text-[11px] text-primary font-semibold italic text-center mt-0.5 -mb-1.5 whitespace-nowrap"
                style={{ lineHeight: '1.1', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                Chaque lien nous renforce.
              </span>
            </div>
          </Link>

          <div className={`flex items-center min-w-0 ${!isAuthenticated ? 'space-x-2 sm:space-x-3' : 'space-x-0.5'} shrink-0`} style={{maxWidth:'100vw'}}>
            <Link
              to="/search"
              className="p-2 text-gray-600 hover:text-primary transition"
              title="Rechercher"
            >
              <FiSearch className="w-5 h-5" />
            </Link>

            {loading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            ) : isAuthenticated && user ? (
              <>
                <Link
                  to="/dashboard"
                  className="p-2 text-gray-600 hover:text-primary transition"
                  title="Mon profil"
                >
                  <FiUser className="w-5 h-5" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-primary transition"
                  title="Déconnexion"
                >
                  <FiLogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-2 sm:px-3 py-1 text-gray-700 hover:text-primary transition text-sm"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-2 sm:px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary-600 transition text-sm"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

