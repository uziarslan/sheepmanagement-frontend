import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './components/Layout/DashboardLayout';
import {
  Login,
  Register,
  Dashboard,
  Capital,
  AnimalList,
  AnimalForm,
  PenList,
  PenForm,
  StockList,
  StockForm,
  EmployeeList,
  EmployeeForm
} from './pages';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#333',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            borderRadius: '0.75rem',
            padding: '1rem',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          
          {/* Capital */}
          <Route path="capital" element={<Capital />} />
          
          {/* Animals */}
          <Route path="animals" element={<AnimalList />} />
          <Route path="animals/add" element={<AnimalForm />} />
          <Route path="animals/:id" element={<AnimalForm />} />
          <Route path="animals/:id/edit" element={<AnimalForm />} />
          
          {/* Pens */}
          <Route path="pens" element={<PenList />} />
          <Route path="pens/add" element={<PenForm />} />
          <Route path="pens/:id" element={<PenForm />} />
          <Route path="pens/:id/edit" element={<PenForm />} />
          
          {/* Stock */}
          <Route path="stock" element={<StockList />} />
          <Route path="stock/add" element={<StockForm />} />
          <Route path="stock/:id/edit" element={<StockForm />} />
          
          {/* Employees */}
          <Route path="employees" element={<EmployeeList />} />
          <Route path="employees/add" element={<EmployeeForm />} />
          <Route path="employees/:id" element={<EmployeeForm />} />
          <Route path="employees/:id/edit" element={<EmployeeForm />} />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 404 - Redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;
