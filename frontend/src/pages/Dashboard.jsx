import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl, fileUrl, rawFileUrl } from '../config/urls';
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
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    whatsappNumber: '',
    accountType: '',
    country: '',
    city: '',
    neighborhood: '',
    gender: '',
    age: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

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
      showSuccess('Compte supprim?? avec succ??s');
      logout();
      navigate('/');
    } catch (error) {
      showError('Erreur lors de la suppression du compte');
      setDeleteAccountModal(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await axios.put(
        apiUrl('/users/me'),
        {
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          whatsappNumber: profileForm.whatsappNumber,
          accountType: profileForm.accountType || null,
          country: profileForm.country || null,
          city: profileForm.city || null,
          neighborhood: profileForm.neighborhood || null,
          gender: profileForm.gender || null,
          age: profileForm.age ? Number(profileForm.age) : null
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      await fetchUser();
      showSuccess('Profil mis a jour');
      setEditProfileOpen(false);
    } catch (error) {
      showError('Erreur lors de la mise a jour du profil');
    } finally {
      setSavingProfile(false);
    }
  };

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

      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Mon profil</h2>
        <p className="text-sm text-gray-600 mb-4">
          Mettez a jour vos informations ou supprimez votre compte.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setEditProfileOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition"
          >
            Modifier le profil
          </button>
          <button
            onClick={() => setDeleteAccountModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Supprimer le profil
          </button>
        </div>
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
                          src={fileUrl(product.images[0].url, { width: 600 })}
                          alt={product.name}
                          className="w-full h-48 object-contain"
                          style={{maxHeight: '192px', maxWidth: '100%', margin: 0, objectFit: 'contain', background: 'transparent'}}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const fallback = rawFileUrl(product.images[0].url);
                            if (fallback && e.currentTarget.src !== fallback) {
                              e.currentTarget.src = fallback;
                            }
                          }}
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

      {/* Modal de confirmation de suppression de compte */}

      {editProfileOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setEditProfileOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Modifier le profil</h3>
              <button
                onClick={() => setEditProfileOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                x
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="firstName" value={profileForm.firstName} onChange={handleProfileChange} placeholder="Prenom" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <input name="lastName" value={profileForm.lastName} onChange={handleProfileChange} placeholder="Nom" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <input name="whatsappNumber" value={profileForm.whatsappNumber} onChange={handleProfileChange} placeholder="WhatsApp" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <select name="accountType" value={profileForm.accountType} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Type de compte</option>
                <option value="individual">Particulier</option>
                <option value="business">Entreprise</option>
              </select>
              <input name="country" value={profileForm.country} onChange={handleProfileChange} placeholder="Pays" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <input name="city" value={profileForm.city} onChange={handleProfileChange} placeholder="Ville" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <input name="neighborhood" value={profileForm.neighborhood} onChange={handleProfileChange} placeholder="Quartier" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              <select name="gender" value={profileForm.gender} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Sexe</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
                <option value="other">Autre</option>
              </select>
              <input name="age" type="number" min="1" max="120" value={profileForm.age} onChange={handleProfileChange} placeholder="Age" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditProfileOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">Annuler</button>
              <button onClick={handleSaveProfile} disabled={savingProfile} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50">
                {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
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
