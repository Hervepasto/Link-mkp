import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl, fileUrl } from '../config/urls';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/Modal';
import { FiPlus, FiEdit, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { timeAgo } from '../utils/time';

const Dashboard = () => {
  const { user, fetchUser, logout } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, productId: null });
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);

  useEffect(() => {
    if (user?.user_type === 'seller') {
      fetchSellerProducts();
    }
    fetchNotifications();
  }, [user]);

  const fetchSellerProducts = async () => {
    try {
      const response = await axios.get(apiUrl('/products'));
      const myProducts = response.data.products.filter(
        (p) => p.seller_id === user.id
      );
      setProducts(myProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(apiUrl('/comments/notifications'));
      setNotifications(response.data.notifications.filter((n) => !n.is_read));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ isOpen: true, productId: id });
  };

  const handleDeleteConfirm = async () => {
    const { productId } = deleteModal;
    if (!productId) return;

    try {
      await axios.delete(apiUrl(`/products/${productId}`));
      setProducts(products.filter((p) => p.id !== productId));
      setDeleteModal({ isOpen: false, productId: null });
      showSuccess('Produit supprimé avec succès');
    } catch (error) {
      showError('Erreur lors de la suppression');
      setDeleteModal({ isOpen: false, productId: null });
    }
  };

  const markNotificationRead = async (id) => {
    try {
      await axios.put(apiUrl(`/comments/notifications/${id}/read`));
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await axios.delete(apiUrl('/users/me'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      showSuccess('Compte supprimé avec succès');
      logout();
      navigate('/');
    } catch (error) {
      showError('Erreur lors de la suppression du compte');
      setDeleteAccountModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon tableau de bord</h1>
        <p className="text-gray-600">
          Bienvenue, {user?.first_name} {user?.last_name}
        </p>
      </div>

      {notifications.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Notifications ({notifications.length})</h3>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-white p-3 rounded cursor-pointer hover:bg-blue-50"
                onClick={() => markNotificationRead(notif.id)}
              >
                <p className="text-sm text-gray-700">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notif.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.user_type === 'seller' && (
        <>
          <div className="mb-6">
            <Link
              to="/product/new"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition"
            >
              <FiPlus className="w-5 h-5 mr-2" />
              Ajouter un produit
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mes produits</h2>
            {products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">Vous n'avez pas encore de produits</p>
                <Link
                  to="/product/new"
                  className="mt-4 inline-block text-primary hover:text-primary-600"
                >
                  Créer votre premier produit
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {product.images && product.images.length > 0 && (
                      <div className="relative w-full h-48 bg-gray-100">
                        <img
                          src={fileUrl(product.images[0].url)}
                          alt={product.name}
                          className="w-full h-48 object-contain"
                          style={{maxHeight: '192px', maxWidth: '100%', margin: 0, objectFit: 'contain', background: 'transparent'}}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                      {product.created_at && (
                        <div className="text-xs text-gray-500 mb-2">
                          {timeAgo(product.created_at)}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {product.description || 'Aucune description'}
                      </p>
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/product/edit/${product.id}`}
                          className="flex items-center text-primary hover:text-primary-600"
                        >
                          <FiEdit className="w-4 h-4 mr-1" />
                          Modifier
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(product.id)}
                          className="flex items-center text-red-600 hover:text-red-700"
                        >
                          <FiTrash2 className="w-4 h-4 mr-1" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {user?.user_type === 'buyer' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Profil acheteur</h2>
          <p className="text-gray-600">
            Vous pouvez parcourir les produits et contacter les vendeurs.
          </p>
        </div>
      )}

      {/* Section Supprimer le compte */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Zone de danger</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiAlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-red-900">Supprimer mon compte</h3>
              <p className="text-sm text-red-700 mt-1 mb-3">
                Cette action est irréversible. Tous vos produits et données seront définitivement supprimés.
              </p>
              <button
                onClick={() => setDeleteAccountModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm"
              >
                Supprimer mon compte
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression de produit */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, productId: null })}
        title="Supprimer le produit"
        message="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
        type="warning"
        onConfirm={handleDeleteConfirm}
        showCancel={true}
      />

      {/* Modal de confirmation de suppression de compte */}
      <Modal
        isOpen={deleteAccountModal}
        onClose={() => setDeleteAccountModal(false)}
        title="Supprimer votre compte"
        message="Êtes-vous sûr de vouloir supprimer votre compte ? Tous vos produits et données seront définitivement supprimés. Cette action est irréversible."
        type="warning"
        onConfirm={handleDeleteAccount}
        showCancel={true}
      />
    </div>
  );
};

export default Dashboard;
