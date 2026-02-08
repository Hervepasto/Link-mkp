import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const { user } = useAuth();
  const location = useLocation();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const config = user
        ? { 
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Cache-Control': 'no-cache'
            } 
          }
        : { headers: { 'Cache-Control': 'no-cache' } };
      
      // Ajouter un timestamp pour éviter le cache
      const response = await axios.get(`${API_URL}/products?_t=${Date.now()}`, config);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const pendingLink = localStorage.getItem('pendingShareLink');
    if (pendingLink) {
      setShareLink(pendingLink);
      setShareModalOpen(true);
      localStorage.removeItem('pendingShareLink');
    }
  }, []);

  // Rafraîchir quand on revient sur la page
  useEffect(() => {
    if (!loading && location.key) {
      fetchProducts();
    }
  }, [location.key]);


  // Onglets de filtrage (doivent être déclarés avant tout return !)
  const [tab, setTab] = useState('all');
  const filteredProducts = products.filter((product) => {
    if (tab === 'all') return true;
    if (tab === 'products') return product.post_type === 'product' || !product.post_type;
    if (tab === 'needs') return product.post_type === 'need';
    if (tab === 'announcements') return product.post_type === 'announcement';
    return true;
  });

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Découvrez les produits près de chez vous
        </h1>
        <p className="text-gray-600 text-center">
          Trouvez des vendeurs locaux et connectez-vous avec votre communauté
        </p>
      </div>

      {/* Barre d'onglets centrée */}
      <div className="w-full flex justify-center mb-8 overflow-x-hidden">
        <div className="flex flex-nowrap w-full max-w-full rounded-lg shadow bg-white border overflow-x-auto scrollbar-hide gap-0">
          <button
            className={`px-3 sm:px-6 py-2 rounded-l-lg font-semibold focus:outline-none transition-colors ${tab === 'all' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setTab('all')}
          >
            Tous
          </button>
          <button
            className={`px-3 sm:px-6 py-2 font-semibold focus:outline-none transition-colors ${tab === 'products' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setTab('products')}
          >
            Produits
          </button>
          <button
            className={`px-3 sm:px-6 py-2 font-semibold focus:outline-none transition-colors ${tab === 'needs' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setTab('needs')}
          >
            Besoins
          </button>
          <button
            className={`px-3 sm:px-6 py-2 rounded-r-lg font-semibold focus:outline-none transition-colors ${tab === 'announcements' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setTab('announcements')}
          >
            Annonces
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucun produit disponible pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {shareModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShareModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Partagez votre publication</h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                x
              </button>
            </div>
            <p className="text-gray-700 mb-6">
              Partagez votre post avec vos amis, famille et contacts sur WhatsApp.
              Plus vous partagez, plus votre post est visible.
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Plus tard
              </button>
              <button
                onClick={() => {
                  const text = `Bonjour, je partage mon post sur Link : ${shareLink}`;
                  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(waUrl, '_blank');
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 transition animate-pulse"
              >
                Partager sur WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
