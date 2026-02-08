import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { apiUrl, fileUrl } from '../config/urls';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import AutocompleteInput from '../components/AutocompleteInput';
import { FiPackage, FiVolume2, FiSearch, FiAlertCircle } from 'react-icons/fi';

// Catégories pour les besoins
const NEED_CATEGORIES = [
  { value: 'housing', label: '🏠 Logement', icon: '🏠' },
  { value: 'services', label: '🔧 Services', icon: '🔧' },
  { value: 'electronics', label: '📱 Électronique', icon: '📱' },
  { value: 'transport', label: '🚗 Transport', icon: '🚗' },
  { value: 'clothing', label: '👕 Vêtements', icon: '👕' },
  { value: 'food', label: '🍽️ Alimentation', icon: '🍽️' },
  { value: 'health', label: '💊 Santé', icon: '💊' },
  { value: 'education', label: '📚 Éducation', icon: '📚' },
  { value: 'other', label: '📦 Autre', icon: '📦' },
];

const POST_TYPES = [
  { 
    value: 'product', 
    label: 'Produit', 
    description: 'Vendre un article avec prix et photos',
    icon: FiPackage,
    color: 'bg-blue-500'
  },
  { 
    value: 'announcement', 
    label: 'Annonce', 
    description: 'Promouvoir un service, événement ou offre',
    icon: FiVolume2,
    color: 'bg-purple-500'
  },
  { 
    value: 'need', 
    label: 'Besoin', 
    description: 'Rechercher quelque chose ou quelqu\'un',
    icon: FiSearch,
    color: 'bg-orange-500'
  },
];

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const isEdit = !!id;

  const [postType, setPostType] = useState('product');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    country: '',
    city: '',
    neighborhood: '',
    whatsappNumber: '',
    price: '',
    category: '',
    isUrgent: false,
  });
  const [mediaFiles, setMediaFiles] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [removedMediaIds, setRemovedMediaIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  // Charger les informations de l'utilisateur ou du produit
  useEffect(() => {
    if (isEdit) {
      fetchProduct();
    } else {
      fetchUserInfo();
    }
  }, [id, user]);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setInitialLoading(false);
        return;
      }
      
      const response = await axios.get(apiUrl('/users/me'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data.user;
      setFormData(prev => ({
        ...prev,
        country: userData.country || '',
        city: userData.city || '',
        neighborhood: userData.neighborhood || '',
        whatsappNumber: userData.whatsapp_number || '',
      }));
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(apiUrl(`/products/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const product = response.data.product;
      setPostType(product.post_type || 'product');
      setFormData({
        name: product.name,
        description: product.description || '',
        country: product.country,
        city: product.city,
        neighborhood: product.neighborhood,
        whatsappNumber: product.whatsapp_number || '',
        price: product.price || '',
        category: product.category || '',
        isUrgent: product.is_urgent || false,
      });
      setExistingMedia(product.images || []);
    } catch (error) {
      console.error('Error fetching product:', error);
      showError('Erreur lors du chargement');
      navigate('/dashboard');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMediaChange = (e) => {
    const files = Array.from(e.target.files);
    setMediaFiles(prev => [...prev, ...files]);
  };

  const removeNewMedia = (index) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = (mediaId) => {
    setExistingMedia(prev => prev.filter((m) => m.id !== mediaId));
    setRemovedMediaIds(prev => (prev.includes(mediaId) ? prev : [...prev, mediaId]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('neighborhood', formData.neighborhood);
      formDataToSend.append('postType', postType);
      
      if (formData.whatsappNumber) {
        formDataToSend.append('whatsappNumber', formData.whatsappNumber);
      }
      
      if (postType === 'product' && formData.price) {
        formDataToSend.append('price', formData.price);
      }
      
      if (postType === 'need') {
        formDataToSend.append('isUrgent', formData.isUrgent);
        formDataToSend.append('category', formData.category);
      }

      if (removedMediaIds.length > 0) {
        formDataToSend.append('removedMedia', JSON.stringify(removedMediaIds));
      }

      // Ajouter les médias (sauf pour les besoins)
      if (postType !== 'need') {
        mediaFiles.forEach((file) => {
          formDataToSend.append('images', file);
        });
      }

      const token = localStorage.getItem('token');
      const config = {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      };

      const postTypeLabels = {
        'product': 'Produit',
        'announcement': 'Annonce',
        'need': 'Besoin'
      };

      if (isEdit) {
        await axios.put(apiUrl(`/products/${id}`), formDataToSend, config);
        showSuccess(`${postTypeLabels[postType]} modifié avec succès`);
        navigate('/dashboard');
      } else {
        const response = await axios.post(apiUrl('/products'), formDataToSend, config);
        showSuccess(`${postTypeLabels[postType]} créé avec succès`);
        const createdId = response?.data?.product?.id;
        if (createdId) {
          const link = `${window.location.origin}/#/product/${createdId}`;
          localStorage.setItem('pendingShareLink', link);
        }
        // Forcer le retour Ã  l'accueil pour afficher le modal de partage
        window.location.href = '/#/';
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erreur lors de l\'enregistrement';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    const labels = {
      'product': isEdit ? 'Modifier le produit' : 'Vendre un produit',
      'announcement': isEdit ? 'Modifier l\'annonce' : 'Créer une annonce',
      'need': isEdit ? 'Modifier le besoin' : 'Publier un besoin'
    };
    return labels[postType];
  };

  const getNameLabel = () => {
    const labels = {
      'product': 'Nom du produit',
      'announcement': 'Titre de l\'annonce',
      'need': 'Qu\'est-ce que vous recherchez ?'
    };
    return labels[postType];
  };

  const getNamePlaceholder = () => {
    const placeholders = {
      'product': 'Ex: iPhone 12 Pro Max',
      'announcement': 'Ex: Formation en développement web',
      'need': 'Ex: Bouteille de gaz 12kg'
    };
    return placeholders[postType];
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Sélection du type de post (seulement en création) */}
      {!isEdit && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Que souhaitez-vous publier ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {POST_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setPostType(type.value)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  postType === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${type.color} flex items-center justify-center mb-3`}>
                  <type.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">{type.label}</h3>
                <p className="text-sm text-gray-500 mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-8">{getTitle()}</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Nom/Titre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {getNameLabel()} *
          </label>
          <input
            type="text"
            name="name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.name}
            onChange={handleChange}
            placeholder={getNamePlaceholder()}
          />
        </div>

        {/* Prix (uniquement pour les produits) */}
        {postType === 'product' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix (FCFA)
            </label>
            <input
              type="number"
              name="price"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              value={formData.price}
              onChange={handleChange}
              placeholder="Ex: 150000"
            />
          </div>
        )}

        {/* Catégorie et Urgent (uniquement pour les besoins) */}
        {postType === 'need' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                name="category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">Sélectionner une catégorie</option>
                {NEED_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <input
                type="checkbox"
                id="isUrgent"
                name="isUrgent"
                checked={formData.isUrgent}
                onChange={handleChange}
                className="w-5 h-5 text-red-500 rounded focus:ring-red-500"
              />
              <label htmlFor="isUrgent" className="flex items-center cursor-pointer">
                <FiAlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="font-medium text-red-700">Besoin urgent</span>
                <span className="text-sm text-red-600 ml-2">(affiche un badge URGENT)</span>
              </label>
            </div>
          </>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description {postType === 'need' ? '*' : ''}
          </label>
          <textarea
            name="description"
            rows={4}
            required={postType === 'need'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.description}
            onChange={handleChange}
            placeholder={postType === 'need' 
              ? 'Décrivez précisément ce que vous recherchez...'
              : 'Description détaillée...'}
          />
        </div>

        {/* Localisation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AutocompleteInput
            value={formData.country}
            onChange={(value) => handleFieldChange('country', value)}
            placeholder="Ex: Cameroun"
            endpoint="countries"
            label="Pays *"
          />
          <AutocompleteInput
            value={formData.city}
            onChange={(value) => handleFieldChange('city', value)}
            placeholder="Ex: Yaoundé"
            endpoint="cities"
            queryParams={{ country: formData.country }}
            label="Ville *"
          />
          <AutocompleteInput
            value={formData.neighborhood}
            onChange={(value) => handleFieldChange('neighborhood', value)}
            placeholder="Ex: Bastos"
            endpoint="neighborhoods"
            queryParams={{ city: formData.city }}
            label="Quartier *"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Numéro WhatsApp
          </label>
          <input
            type="tel"
            name="whatsappNumber"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            value={formData.whatsappNumber}
            onChange={handleChange}
            placeholder="Utilisera votre numéro par défaut si vide"
          />
        </div>

        {/* Images et Vidéos (sauf pour les besoins) */}
        {postType !== 'need' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images et Vidéos {postType === 'product' && !isEdit && '*'}
            </label>
            {existingMedia.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-4">
                {existingMedia.map((media) => (
                  <div key={media.id} className="relative">
                    {media.media_type === 'video' ? (
                      <video
                        src={fileUrl(media.url)}
                        className="w-full h-32 object-cover rounded"
                        controls
                      />
                    ) : (
                      <img
                        src={fileUrl(media.url)}
                        alt="Media"
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingMedia(media.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-gray-500 mt-1">
              Vous pouvez sélectionner plusieurs images et vidéos (max 10, 50MB chacun)
            </p>
            
            {mediaFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Fichiers sélectionnés ({mediaFiles.length}) :
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="relative">
                      {file.type.startsWith('video/') ? (
                        <video
                          src={URL.createObjectURL(file)}
                          className="w-full h-32 object-cover rounded"
                          controls
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewMedia(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info pour les besoins */}
        {postType === 'need' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>ℹ️ Note :</strong> Les besoins n'ont pas d'images. Les personnes intéressées 
              vous contacteront directement sur WhatsApp pour vous proposer ce que vous recherchez.
            </p>
          </div>
        )}

        {/* Boutons */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Publier'}
          </button>
        </div>
      </form>

    </div>
  );
};

export default ProductForm;
