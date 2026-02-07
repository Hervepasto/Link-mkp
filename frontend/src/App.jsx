import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import FloatingAddButton from './components/FloatingAddButton';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProductForm from './pages/ProductForm';
import ProductDetail from './pages/ProductDetail';
import Search from './pages/Search';
import UserProfile from './pages/UserProfile';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <FloatingAddButton />
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<Search />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/product/new"
            element={
              <PrivateRoute requireSeller>
                <ProductForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/product/edit/:id"
            element={
              <PrivateRoute requireSeller>
                <ProductForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
