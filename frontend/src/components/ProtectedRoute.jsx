import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, brokerOnly = false }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (brokerOnly && user.role !== 'broker') {
    return <Navigate to="/" replace />;
  }
  return children;
}
