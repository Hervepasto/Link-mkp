import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../config/urls';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Modal from '../components/Modal';
import { FiEye, FiHeart, FiMessageCircle, FiArrowLeft, FiShare2, FiRepeat, FiEdit, FiSearch, FiVolume2 } from 'react-icons/fi';
import MediaCarousel from '../components/MediaCarousel';
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

const CATEGORY_LABELS = {
  'housing': 'Logement',
  'services': 'Services',
  'electronics': 'Électronique',
  'transport': 'Transport',
  'clothing': 'Vêtements',
  'food': 'Alimentation',
  'health': 'Santé',
  'education': 'Éducation',
  'other': 'Autre',
};

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

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useNotification();
  const [product, setProduct] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [interested, setInterested] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [repostModal, setRepostModal] = useState({ isOpen: false });
  const shareMenuRef = useRef(null);
  const shareButtonRef = useRef(null);

  useEffect(() => {
    fetchProduct();
    fetchComments();
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        shareMenuRef.current && 
        !shareMenuRef.current.contains(event.target) &&
        shareButtonRef.current &&
        !shareButtonRef.current.contains(event.target)
      ) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  const fetchProduct = async () => {
    try {
      const config = user
        ? { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        : {};
      
      const response = await axios.get(apiUrl(`/products/${id}`), config);
      setProduct(response.data.product);
      setInterested(response.data.product.is_interested || false);
    } catch (error) {
      console.error('Error fetching product:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(apiUrl(`/comments/product/${id}`));
      setComments(response.data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleInterested = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('handleInterested called', { user: !!user, interested, product: !!product, id });
    
    if (!user) {
      console.log('No user, redirecting to login');
      navigate('/login');
      return;
    }

    if (!product) {
      console.log('No product, returning');
      return;
    }

    try {
      console.log('Sending interest request to:', `/api/products/${id}/interested`);
      const response = await axios.post(apiUrl(`/products/${id}/interested`), {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log('Interest response:', response.data);
      
      // Mettre à jour l'état seulement si l'utilisateur n'avait pas encore cliqué
      if (!interested) {
        setInterested(true);
        setProduct({ 
          ...product, 
          interested_count: response.data.interestedCount || (product.interested_count || 0) + 1,
          views_count: response.data.viewsCount || product.views_count
        });
      } else {
        // Mettre à jour les compteurs même si déjà intéressé
        setProduct({ 
          ...product, 
          views_count: response.data.viewsCount || product.views_count
        });
      }
      
      setWhatsappUrl(response.data.whatsappUrl);
      
      // Toujours ouvrir WhatsApp quand on clique sur le bouton
      if (response.data.whatsappUrl) {
        window.open(response.data.whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Error handling interest:', error);
      console.error('Error details:', error.response?.data || error.message);
      showError('Erreur lors de l\'enregistrement de l\'intérêt. Veuillez réessayer.');
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!commentText.trim()) return;

    try {
      await axios.post(apiUrl('/comments'), {
        productId: id,
        content: commentText,
      });
      setCommentText('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const getShareUrl = () => {
    return `${window.location.origin}/product/${id}`;
  };

  const getShareText = () => {
    if (!product) return 'Découvrez ce produit sur Link';
    if (product.post_type === 'need') {
      return `Bonjour, je peux vous aider pour votre besoin : « ${product.name} » publié sur Link`;
    }
    if (product.post_type === 'announcement') {
      return `Bonjour, je suis intéressé par votre annonce « ${product.name} » et aimerais en savoir davantage.`;
    }
    return `Découvrez "${product.name}" sur Link - ${product.city || ''}`;
  };

  const handleRepost = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (!product) {
      return;
    }

    setRepostModal({ isOpen: true });
  };

  const handleRepostConfirm = async () => {
    try {
      const response = await axios.post(apiUrl(`/products/${id}/repost`), {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setRepostModal({ isOpen: false });
      showSuccess('Produit republié avec succès !');
      // Optionnel: rediriger vers le fil d'actualité ou recharger la page
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Error reposting product:', error);
      const errorMessage = error.response?.data?.error || 'Erreur lors du repartage. Veuillez réessayer.';
      showError(errorMessage);
      setRepostModal({ isOpen: false });
    }
  };

  const handleShare = (platform, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('handleShare called', { platform, product: !!product });
    
    if (!product) {
      console.log('No product for sharing');
      return;
    }
    
    const url = getShareUrl();
    const text = getShareText();
    const fullText = `${text} ${url}`;

    switch (platform) {
      case 'facebook':
        // Essayer avec le paramètre quote (peut ne pas toujours fonctionner selon les politiques Facebook)
        // Alternative: copier le texte dans le presse-papiers pour que l'utilisateur puisse le coller
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(fullText)}`;
        
        // Copier aussi le texte dans le presse-papiers comme solution de secours
        navigator.clipboard.writeText(fullText).then(() => {
          // Ouvrir Facebook
          window.open(facebookUrl, '_blank');
          // Afficher un message informatif après un court délai
          setTimeout(() => {
            showInfo('Le texte et le lien ont été copiés dans votre presse-papiers. Si le texte n\'apparaît pas automatiquement sur Facebook, collez-le (Ctrl+V) dans le champ de publication.', 5000);
          }, 500);
        }).catch(() => {
          // Si la copie échoue, ouvrir quand même Facebook
          window.open(facebookUrl, '_blank');
        });
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(fullText).then(() => {
          showSuccess('Texte et lien copiés dans le presse-papiers !');
        }).catch(() => {
          showError('Erreur lors de la copie du lien');
        });
        break;
      default:
        break;
    }
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const postType = product.post_type || 'product';
  const isNeed = postType === 'need';
  const isAnnouncement = postType === 'announcement';
  const categoryIcon = CATEGORY_ICONS[product.category] || '🔍';
  const categoryLabel = CATEGORY_LABELS[product.category] || 'Autre';
  const categoryColor = CATEGORY_COLORS[product.category] || 'from-gray-400 to-gray-600';

  const getPostTypeLabel = () => {
    if (isNeed) return 'Besoin';
    if (isAnnouncement) return 'Annonce';
    return 'Produit';
  };

  const getInterestButtonText = () => {
    if (isNeed) return interested ? 'Je peux aider ✓' : 'Je peux aider';
    return interested ? 'Intéressé ✓' : 'Je suis intéressé';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center text-gray-600 hover:text-primary"
      >
        <FiArrowLeft className="w-5 h-5 mr-2" />
        Retour
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-visible">
        {/* Header pour les besoins (sans images) */}
        {isNeed ? (
          <div className={`relative h-64 bg-gradient-to-br ${categoryColor} flex flex-col items-center justify-center`}>
            {/* Badge BESOIN */}
            <div className="absolute top-4 left-4 bg-white/90 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center">
              <FiSearch className="w-4 h-4 mr-1" />
              BESOIN
            </div>
            
            {/* Badge URGENT */}
            {product.is_urgent && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                🚨 URGENT
              </div>
            )}
            
            {/* Catégorie */}
            {product.category && (
              <div className="absolute bottom-4 left-4 bg-white/90 text-gray-700 px-3 py-1 rounded-full text-sm">
                {categoryIcon} {categoryLabel}
              </div>
            )}
            
            {/* Grande icône */}
            <span className="text-8xl mb-4">{categoryIcon}</span>
          </div>
        ) : (
          <>
            {/* Images et Vidéos pour produits et annonces */}
            {product.images && product.images.length > 0 && (
              <div className="relative h-96 bg-gray-200 overflow-hidden">
                {/* Badge type de post */}
                {isAnnouncement && (
                  <div className="absolute top-4 left-4 z-10 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center">
                    <FiVolume2 className="w-4 h-4 mr-1" />
                    ANNONCE
                  </div>
                )}
                <MediaCarousel 
                  media={product.images} 
                  className="h-96"
                  productId={product.id}
                  onViewRegistered={(newViewsCount) => setProduct(prev => ({ ...prev, views_count: newViewsCount }))}
                />
              </div>
            )}
          </>
        )}

        <div className="p-6 relative">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

          {product.created_at && (
            <div className="text-sm text-gray-500 mb-3">
              {timeAgo(product.created_at)}
            </div>
          )}
          
          {/* Prix (uniquement pour les produits) */}
          {!isNeed && !isAnnouncement && product.price && (
            <p className="text-2xl font-bold text-primary mb-4">
              {Number(product.price).toLocaleString()} FCFA
            </p>
          )}
          
          <div className="mb-4 text-gray-600">
            <p className="mb-2">
              <span className="font-semibold">{isNeed ? 'Demandeur:' : 'Vendeur:'}</span> {product.seller_name}
              {product.seller_account_type && (
                <span className="ml-2 text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded">
                  {product.seller_account_type === 'business' ? 'Entreprise' : 'Particulier'}
                </span>
              )}
            </p>
            <p>
              <span className="font-semibold">Localisation:</span> {product.neighborhood}, {product.city}, {product.country}
            </p>
          </div>

          {product.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-3 mb-6 pb-6 border-b w-full">
            <div className="flex items-center space-x-2 text-gray-600">
              <FiEye className="w-5 h-5" />
              <span>{product.views_count || 0} vues</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <FiHeart className={`w-5 h-5 ${interested ? 'text-red-500 fill-current' : ''}`} />
              <span>{product.interested_count || 0} intéressés</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <FiMessageCircle className="w-5 h-5" />
              <span>{comments.length} commentaires</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:space-x-4 w-full" onClick={(e) => e.stopPropagation()}>
            {user && product && user.id === product.seller_id ? (
              <Link
                to={`/product/edit/${product.id}`}
                className="w-full sm:w-auto px-3 sm:px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition flex items-center justify-center space-x-2"
              >
                <FiEdit className="w-5 h-5" />
                <span>Modifier</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleInterested}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-full sm:w-auto px-3 sm:px-6 py-3 rounded-lg font-semibold transition relative z-10 ${
                  interested
                    ? isNeed ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-primary text-white hover:bg-primary-600'
                    : 'bg-primary text-white hover:bg-primary-600'
                } cursor-pointer flex items-center justify-center`}
              >
                {getInterestButtonText()}
              </button>
            )}
            <div className="relative" ref={shareButtonRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowShareMenu(prev => !prev);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-full sm:w-auto px-3 sm:px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <FiShare2 className="w-5 h-5" />
                <span>Partager</span>
              </button>
            </div>
            {user && product && user.id !== product.seller_id && (
              <button
                type="button"
                onClick={handleRepost}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="w-full sm:w-auto px-3 sm:px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-600 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <FiRepeat className="w-5 h-5" />
                <span>Republier</span>
              </button>
            )}
          </div>
          
          {showShareMenu && product && shareButtonRef.current && createPortal(
            <div 
              ref={shareMenuRef}
              className="fixed bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] w-48"
              style={{
                top: shareButtonRef.current.getBoundingClientRect().bottom + 8,
                right: window.innerWidth - shareButtonRef.current.getBoundingClientRect().right,
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="py-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Facebook share clicked');
                    handleShare('facebook', e);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                >
                  <span className="text-blue-600 text-xl">f</span>
                  <span>Facebook</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Twitter share clicked');
                    handleShare('twitter', e);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                >
                  <span className="text-blue-400 text-xl">𝕏</span>
                  <span>Twitter / X</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('WhatsApp share clicked');
                    handleShare('whatsapp', e);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                >
                  <span className="text-green-500 text-xl">💬</span>
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('LinkedIn share clicked');
                    handleShare('linkedin', e);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                >
                  <span className="text-blue-700 text-xl">in</span>
                  <span>LinkedIn</span>
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Copy link clicked');
                    handleShare('copy', e);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2 cursor-pointer"
                >
                  <span className="text-gray-600">📋</span>
                  <span>Copier le lien</span>
                </button>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Commentaires */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Commentaires</h2>

        {user ? (
          <form onSubmit={handleComment} className="mb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Ajouter un commentaire..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary mb-2"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600"
            >
              Publier
            </button>
          </form>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <Link to="/login" className="text-primary hover:text-primary-600">
              Connectez-vous
            </Link>{' '}
            pour commenter
          </div>
        )}

        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun commentaire pour le moment</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{comment.user_name}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="text-gray-700">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de confirmation de repartage */}
      <Modal
        isOpen={repostModal.isOpen}
        onClose={() => setRepostModal({ isOpen: false })}
        title="Republier le produit"
        message="Voulez-vous republier ce produit sur votre profil ?"
        type="info"
        onConfirm={handleRepostConfirm}
        showCancel={true}
      />
    </div>
  );
};

export default ProductDetail;
