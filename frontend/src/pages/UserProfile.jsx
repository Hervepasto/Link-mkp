import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../config/urls';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ProductCard from '../components/ProductCard';
import Modal from '../components/Modal';
import { FiTrash2, FiEdit, FiRefreshCw } from 'react-icons/fi';

const UserProfile = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });
  
  // Vérifier si l'utilisateur connecté est le propriétaire du profil
  const isOwnProfile = currentUser && currentUser.id === id;

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get(apiUrl(`/users/${id}?_t=${Date.now()}`));
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, [id]);

  const fetchUserProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Cache-Control': 'no-cache',
        }
      };
      // Ajouter un timestamp pour éviter le cache
      const response = await axios.get(apiUrl(`/products?seller=${id}&_t=${Date.now()}`), config);
      console.log('Produits récupérés:', response.data.products);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [id]);

  // Charger les données au montage et quand l'id change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUser(), fetchUserProducts()]);
      setLoading(false);
    };
    loadData();
  }, [id, fetchUser, fetchUserProducts]);

  // Rafraîchir quand on revient sur la page (par exemple après avoir créé un produit)
  useEffect(() => {
    if (!loading) {
      fetchUserProducts();
    }
  }, [location.key]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserProducts();
    setRefreshing(false);
  };

  const handleDeleteClick = (productId) => {
    setDeleteModal({ isOpen: true, productId });
  };

  const handleDeleteConfirm = async () => {
    const { productId } = deleteModal;
    if (!productId) return;

    try {
      await axios.delete(apiUrl(`/products/${productId}`), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      // Retirer le produit de la liste
      setProducts(products.filter((p) => p.id !== productId));
      setDeleteModal({ isOpen: false, productId: null });
      showSuccess('Produit supprimé avec succès');
    } catch (error) {
      console.error('Error deleting product:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors de la suppression';
      showError(errorMessage);
      setDeleteModal({ isOpen: false, productId: null });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-center text-gray-500">Utilisateur non trouvé</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {user.first_name} {user.last_name}
        </h1>
        {user.account_type && (
          <span className="inline-block text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded mb-4">
            {user.account_type === 'business' ? 'Entreprise' : 'Particulier'}
          </span>
        )}
        {user.city && (
          <p className="text-gray-600">
            📍 {user.city}{user.neighborhood ? `, ${user.neighborhood}` : ''}
            {user.country ? `, ${user.country}` : ''}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Produits publiés ({products.length})
          </h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
            title="Rafraîchir la liste"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Rafraîchir</span>
          </button>
        </div>
        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun produit publié</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {products.map((product) => (
              <ProductCard product={product} isOwnProfile={isOwnProfile} onDelete={handleDeleteClick} />
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, productId: null })}
        title="Supprimer le produit"
        message="Êtes-vous sûr de vouloir supprimer ce produit de votre profil ? Cette action est irréversible."
        type="warning"
        onConfirm={handleDeleteConfirm}
        showCancel={true}
      />
    </div>
  );
};

export default UserProfile;
