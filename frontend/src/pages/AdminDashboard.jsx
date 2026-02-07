import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/urls';
import { useNotification } from '../context/NotificationContext';

const StatCard = ({ title, value, subtitle }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
  </div>
);

const AdminDashboard = () => {
  const { showError } = useNotification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(apiUrl('/admin/stats'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(response.data);
      } catch (error) {
        if (error.response?.status === 403) {
          setForbidden(true);
          return;
        }
        showError('Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [showError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-xl font-semibold mb-2">AccÃ¨s refusÃ©</h1>
          <p className="text-gray-600">
            Ce compte nâ€™est pas autorisÃ© Ã  accÃ©der aux statistiques administrateur.
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { users, posts, totals, recents, newUsers, topProducts, topSellers, dailyUsers, dailyPosts } = stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Statistiques du site</h1>
        <p className="text-gray-600">Vue globale de lâ€™activitÃ©</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Utilisateurs" value={users.total} subtitle={`${users.sellers} vendeurs â€¢ ${users.buyers} acheteurs`} />
        <StatCard title="Posts" value={posts.total} subtitle={`${posts.products} produits â€¢ ${posts.announcements} annonces â€¢ ${posts.needs} besoins`} />
        <StatCard title="Vues totales" value={totals.views_total} />
        <StatCard title="IntÃ©ressÃ©s totaux" value={totals.interested_total} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Posts aujourdâ€™hui" value={recents.posts_today} />
        <StatCard title="Posts 7 jours" value={recents.posts_week} />
        <StatCard title="Posts 30 jours" value={recents.posts_month} />
        <StatCard title="Nouveaux utilisateurs (30j)" value={newUsers.users_month} subtitle={`Aujourdâ€™hui: ${newUsers.users_today} â€¢ 7j: ${newUsers.users_week}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-3">Top 5 produits (vues)</h2>
          <div className="space-y-2">
            {topProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div className="truncate pr-2">{p.name}</div>
                <div className="text-gray-600">{p.views_count || 0} vues</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-3">Top 5 vendeurs (posts)</h2>
          <div className="space-y-2">
            {topSellers.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                <div className="truncate pr-2">{s.first_name} {s.last_name}</div>
                <div className="text-gray-600">{s.posts_count} posts</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-3">Nouveaux utilisateurs (14 jours)</h2>
          <div className="space-y-1 text-sm text-gray-700">
            {dailyUsers.map((d) => (
              <div key={d.day} className="flex items-center justify-between">
                <span>{d.day}</span>
                <span>{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-lg mb-3">Nouveaux posts (14 jours)</h2>
          <div className="space-y-1 text-sm text-gray-700">
            {dailyPosts.map((d) => (
              <div key={d.day} className="flex items-center justify-between">
                <span>{d.day}</span>
                <span>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
