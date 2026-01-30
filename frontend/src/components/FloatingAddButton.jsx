import { Link } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const FloatingAddButton = () => {
  const { user, isAuthenticated, loading } = useAuth();

  // Ne pas afficher pendant le chargement
  if (loading) {
    return null;
  }

  // N'afficher que pour les utilisateurs connectés qui peuvent poster (sellers)
  if (!isAuthenticated || !user || user.user_type !== 'seller') {
    return null;
  }

  return (
    <Link
      to="/product/new"
      className="fixed bottom-24 sm:bottom-6 right-8 sm:right-8 w-14 h-14 bg-primary hover:bg-primary-600 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
      title="Ajouter un post"
    >
      <FiPlus className="w-7 h-7 text-white" />
    </Link>
  );
};

export default FloatingAddButton;
