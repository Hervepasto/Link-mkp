import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const response = await axios.get(`/api/products?_t=${Date.now()}`, config);
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
    </div>
  );
};

export default Home;
