import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiHeart, FiMessageCircle, FiVolume2, FiSearch } from 'react-icons/fi';
import axios from 'axios';
import { apiUrl } from '../config/urls';
import { useAuth } from '../context/AuthContext';
import MediaCarousel from './MediaCarousel';
import { timeAgo } from '../utils/time';

// Icônes des catégories pour les besoins
const CATEGORY_ICONS = {
  'housing': '🏠',
  'services': '🔧',
  'electronics': '📱',
  'transport': '🚗',
  'clothing': '👕',
  'food': '🍽️',
  'health': '💊',
  'education': '📚',
  'other': '📦',
};

// Couleurs de fond pour les besoins
const CATEGORY_COLORS = {
  'housing': 'from-blue-400 to-blue-600',
  'services': 'from-orange-400 to-orange-600',
  'electronics': 'from-purple-400 to-purple-600',
  'transport': 'from-green-400 to-green-600',
  'clothing': 'from-pink-400 to-pink-600',
  'food': 'from-yellow-400 to-yellow-600',
  'health': 'from-red-400 to-red-600',
  'education': 'from-indigo-400 to-indigo-600',
  'other': 'from-gray-400 to-gray-600',
};

const ProductCard = ({ product, onUpdate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interested, setInterested] = useState(product.is_interested || false);
  const [interestedCount, setInterestedCount] = useState(product.interested_count || 0);
  const [viewsCount, setViewsCount] = useState(product.views_count || 0);

  const postType = product.post_type || 'product';
  const isNeed = postType === 'need';
  const isAnnouncement = postType === 'announcement';

  const handleInterested = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    // Si l'utilisateur a déjà cliqué, ouvrir juste WhatsApp
    if (interested) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          apiUrl(`/products/${product.id}/interested`),
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.whatsappUrl) {
          window.open(response.data.whatsappUrl, '_blank');
        }
      } catch (error) {
        console.error('Error:', error);
      }
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        apiUrl(`/products/${product.id}/interested`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInterested(true);
      setInterestedCount((prev) => prev + 1);
      
      if (response.data.viewsCount !== undefined) {
        setViewsCount(response.data.viewsCount);
      }
      
      if (response.data.whatsappUrl) {
        window.open(response.data.whatsappUrl, '_blank');
      }

      if (onUpdate) {
        onUpdate(product.id, { interestedCount: interestedCount + 1, viewsCount: response.data.viewsCount });
      }
    } catch (error) {
      console.error('Error handling interest:', error);
    }
  };

  // Affichage pour les besoins (sans image)
  if (isNeed) {
    const categoryIcon = CATEGORY_ICONS[product.category] || '🔍';
    const categoryColor = CATEGORY_COLORS[product.category] || 'from-gray-400 to-gray-600';
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition w-full h-[220px] sm:h-[280px] flex flex-col">
        {/* En-tête coloré avec icône */}
        <div className={`relative h-28 sm:h-36 bg-gradient-to-br ${categoryColor} flex flex-col items-center justify-center flex-shrink-0`}>
          {/* Badge BESOIN */}
          <div className="absolute top-2 left-2 bg-white/90 text-gray-800 px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center">
            <FiSearch className="w-2.5 h-2.5 mr-0.5" />
            BESOIN
          </div>
          
          {/* Badge URGENT */}
          {product.is_urgent && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
              🚨 URGENT
            </div>
          )}
          
          {/* Grande icône de catégorie */}
          <span className="text-4xl mb-1">{categoryIcon}</span>
          
          {/* Titre du besoin */}
          <h3 className="text-white font-bold text-xs text-center px-2 line-clamp-2">
            {product.name}
          </h3>
        </div>
        
        <div className="p-2 flex flex-col flex-grow">
          {/* Description */}
          <p className="text-[10px] text-gray-600 mb-1 line-clamp-1">
            {product.description || ''}
          </p>
          
          {/* Localisation et vendeur */}
          <div className="flex items-center justify-between mb-1">
            <Link 
              to={`/user/${product.seller_id || ''}`}
              className="text-[10px] text-gray-600 hover:text-primary transition truncate"
              onClick={(e) => e.stopPropagation()}
            >
              👤 {product.seller_name}
            </Link>
            {(product.city || product.neighborhood) && (
              <div className="text-[10px] text-gray-500">
                📍 {product.city}{product.neighborhood ? `, ${product.neighborhood}` : ''}
              </div>
            )}
          </div>

          {product.created_at && (
            <div className="text-[10px] text-gray-500 mb-1">
              {timeAgo(product.created_at)}
            </div>
          )}
          
          {/* Stats */}
          <div className="flex items-center text-[10px] mb-1 text-gray-600 space-x-2">
            <div className="flex items-center space-x-0.5">
              <FiEye className="w-2.5 h-2.5" />
              <span>{viewsCount}</span>
            </div>
            <div className="flex items-center space-x-0.5">
              <FiHeart className={`w-2.5 h-2.5 ${interested ? 'text-red-500 fill-current' : ''}`} />
              <span>{interestedCount}</span>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-grow"></div>

          <button
            onClick={handleInterested}
            className={`w-full px-2 py-1.5 rounded-lg font-semibold text-[10px] transition ${
              interested
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-primary text-white hover:bg-primary-600'
            }`}
          >
            {interested ? 'Je peux aider ✓' : 'Je peux aider'}
          </button>
        </div>
      </div>
    );
  }

  // Affichage pour les annonces et produits (avec images)
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition h-[280px] flex flex-col">
      <div className="relative h-36 bg-gray-200 overflow-hidden flex-shrink-0">
        {/* Badge type de post */}
        {isAnnouncement && (
          <div className="absolute top-2 left-2 z-10 bg-purple-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center">
            <FiVolume2 className="w-2.5 h-2.5 mr-0.5" />
            ANNONCE
          </div>
        )}
        
        <MediaCarousel 
          media={product.images || []} 
          className="h-36 w-full"
          onImageClick={() => navigate(`/product/${product.id}`)}
          productId={product.id}
          onViewRegistered={(newViewsCount) => setViewsCount(newViewsCount)}
        />
      </div>
      
      <div className="p-2 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-1">
          <Link to={`/product/${product.id}`} className="flex-1">
            <h3 className="font-semibold text-xs text-gray-900 hover:text-primary transition line-clamp-1">
              {product.name}
            </h3>
          </Link>
          {(product.city || product.neighborhood) && (
            <div className="flex items-center text-[10px] text-gray-500 ml-1">
              <span className="mr-0.5">📍</span>
              <span>{product.city}{product.neighborhood ? `, ${product.neighborhood}` : ''}</span>
            </div>
          )}
        </div>

        {product.created_at && (
          <div className="text-[10px] text-gray-500 mb-1">
            {timeAgo(product.created_at)}
          </div>
        )}
        
        {/* Prix (uniquement pour les produits) */}
        {!isAnnouncement && product.price && (
          <p className="text-primary font-bold text-xs mb-1">
            {Number(product.price).toLocaleString()} FCFA
          </p>
        )}
        
        <Link 
          to={`/user/${product.seller_id || ''}`}
          className="text-[10px] text-gray-600 hover:text-primary transition mb-1 block truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {product.seller_name}
        </Link>
        
        <div className="flex items-center text-[10px] mb-1 text-gray-600 space-x-2">
          <div className="flex items-center space-x-0.5">
            <FiEye className="w-2.5 h-2.5" />
            <span>{viewsCount}</span>
          </div>
          <div className="flex items-center space-x-0.5">
            <FiHeart className={`w-2.5 h-2.5 ${interested ? 'text-red-500 fill-current' : ''}`} />
            <span>{interestedCount}</span>
          </div>
          <div className="flex items-center space-x-0.5">
            <FiMessageCircle className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-grow"></div>

        <button
          onClick={handleInterested}
          className={`w-full px-2 py-1.5 rounded-lg font-semibold text-[10px] transition ${
            interested
              ? 'bg-primary text-white hover:bg-primary-600'
              : 'bg-primary text-white hover:bg-primary-600'
          }`}
        >
          {interested ? 'Intéressé ✓' : 'Je suis intéressé'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
