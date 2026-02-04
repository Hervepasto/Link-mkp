import { useState, useEffect, useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import axios from 'axios';
import { apiUrl, fileUrl } from '../config/urls';

const MediaCarousel = ({ media = [], className = '', onImageClick, productId, onViewRegistered }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [hasRegisteredView, setHasRegisteredView] = useState(false);
  const intervalRef = useRef(null);

  // Enregistrer une vue quand l'utilisateur navigue dans le carrousel
  const registerView = async () => {
    if (!productId || hasRegisteredView) return;
    
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.post(apiUrl(`/products/${productId}/view`), {}, config);
      setHasRegisteredView(true);
      
      // Notifier le parent du nouveau compteur de vues
      if (onViewRegistered && response.data.viewsCount !== undefined) {
        onViewRegistered(response.data.viewsCount);
      }
    } catch (error) {
      // Ignorer les erreurs silencieusement
    }
  };

  // Navigation automatique toutes les 5 secondes
  useEffect(() => {
    if (media.length <= 1) return;

    if (isAutoPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % media.length);
      }, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [media.length, isAutoPlaying]);

  const goToPrevious = (e) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + media.length) % media.length);
    registerView(); // Enregistrer la vue
  };

  const goToNext = (e) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % media.length);
    registerView(); // Enregistrer la vue
  };

  const goToSlide = (e, index) => {
    e.stopPropagation();
    setIsAutoPlaying(false);
    setCurrentIndex(index);
    registerView(); // Enregistrer la vue
  };

  if (!media || media.length === 0) {
    return (
      <div className={`relative bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-gray-400">Pas de média</div>
      </div>
    );
  }

  const currentMedia = media[currentIndex];

  const handleMediaClick = (e) => {
    // Ne pas naviguer si on clique sur les contrôles vidéo
    if (e.target.tagName === 'VIDEO') return;
    if (onImageClick) {
      onImageClick();
    }
  };

  return (
    <div className={`relative ${className} overflow-hidden`}>
      <div 
        className="absolute inset-0 bg-white cursor-pointer flex items-center justify-center h-full w-full"
        onClick={handleMediaClick}
      >
        {currentMedia.media_type === 'video' ? (
          <video
            src={fileUrl(currentMedia.url)}
            className="max-w-full max-h-full object-contain"
            controls
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            src={fileUrl(currentMedia.url)}
            alt={`Media ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            style={{ display: 'block' }}
          />
        )}
      </div>

      {/* Flèches de navigation */}
      {media.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition z-20"
            aria-label="Précédent"
          >
            <FiChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition z-20"
            aria-label="Suivant"
          >
            <FiChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicateurs de position (dots) */}
      {media.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
          {media.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToSlide(e, index)}
              className={`w-2 h-2 rounded-full transition ${
                index === currentIndex
                  ? 'bg-white'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              aria-label={`Aller à la slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaCarousel;
