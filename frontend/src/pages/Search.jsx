import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import ProductCard from '../components/ProductCard';
import AutocompleteInput from '../components/AutocompleteInput';

const Search = () => {
  const [searchType, setSearchType] = useState('products');
  const [filters, setFilters] = useState({
    country: '',
    city: '',
    neighborhood: '',
    keyword: '',
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters.country) params.append('country', filters.country);
      if (filters.city) params.append('city', filters.city);
      if (filters.neighborhood) params.append('neighborhood', filters.neighborhood);
      if (filters.keyword) {
        params.append('keyword', filters.keyword);
      }

      const endpoint = searchType === 'products' ? '/api/search/products' : '/api/search/sellers';
      const response = await axios.get(`${endpoint}?${params.toString()}`);
      
      setResults(searchType === 'products' ? response.data.products : response.data.sellers);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Recherche</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="mb-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setSearchType('products')}
              className={`px-4 py-2 rounded-md transition ${
                searchType === 'products'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Produits
            </button>
            <button
              onClick={() => setSearchType('sellers')}
              className={`px-4 py-2 rounded-md transition ${
                searchType === 'sellers'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vendeurs
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AutocompleteInput
              value={filters.country}
              onChange={(value) => handleFilterChange('country', value)}
              placeholder="Ex: Cameroun"
              endpoint="countries"
              label="Pays"
            />
            <AutocompleteInput
              value={filters.city}
              onChange={(value) => handleFilterChange('city', value)}
              placeholder="Ex: Yaoundé"
              endpoint="cities"
              queryParams={{ country: filters.country }}
              label="Ville"
            />
            <AutocompleteInput
              value={filters.neighborhood}
              onChange={(value) => handleFilterChange('neighborhood', value)}
              placeholder="Ex: Bastos"
              endpoint="neighborhoods"
              queryParams={{ city: filters.city }}
              label="Quartier"
            />
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            💡 <span className="font-medium">Astuce :</span> Plus vous précisez la localisation, plus les résultats sont ciblés. 
            Sans quartier, vous verrez tous les résultats de la ville. Sans ville, tous ceux du pays.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {searchType === 'products' ? 'Mot-clé produit' : 'Produit recherché'}
            </label>
            <input
              type="text"
              name="keyword"
              value={filters.keyword}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder={searchType === 'products' 
                ? "Rechercher un produit..." 
                : "Ex: téléphone, vêtements, chaussures..."}
            />
            {searchType === 'sellers' && (
              <p className="mt-1 text-xs text-gray-500">
                Recherche les vendeurs par les produits qu'ils vendent
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center"
          >
            <FiSearch className="w-5 h-5 mr-2" />
            {loading ? 'Recherche...' : 'Rechercher'}
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Résultats ({results.length})
          </h2>
          {searchType === 'products' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((seller) => (
                <div
                  key={seller.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">
                    {seller.first_name} {seller.last_name}
                  </h3>
                  <p className="text-sm text-primary mb-2">
                    {seller.account_type === 'business' ? '🏢 Entreprise' : '👤 Particulier'}
                  </p>
                  <p className="text-sm text-gray-500 mb-3">
                    📍 {seller.neighborhood && `${seller.neighborhood}, `}
                    {seller.city && `${seller.city}, `}
                    {seller.country}
                  </p>
                  {seller.products_sold && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">Produits vendus :</p>
                      <p className="text-sm text-gray-700">{seller.products_sold}</p>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 mt-4">
                    {seller.whatsapp_number && (
                      <a
                        href={`https://wa.me/${seller.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Contacter
                      </a>
                    )}
                    <Link
                      to={`/user/${seller.id}`}
                      className="text-primary text-sm font-medium hover:text-primary-600"
                    >
                      Voir le profil →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucun résultat trouvé</p>
        </div>
      )}
    </div>
  );
};

export default Search;
