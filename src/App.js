import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './components/Layout/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './Context/AuthContext';
import {
  Login,
  Register,
  Dashboard,
  Capital,
  Liability,
  AnimalList,
  AnimalForm,
  BulkUpload,
  MoveToPen,
  DeclareAnimalDead,
  SellAnimal,
  PenList,
  PenForm,
  StockOverview,
  StockMedicationList,
  StockFeedingList,
  StockAssetList,
  StockMedicationForm,
  StockFeedingForm,
  StockAssetForm,
  StockMedicationBulkUpload,
  StockFeedingBulkUpload,
  StockEdit,
  EmployeeList,
  EmployeeForm,
  EmployeeAdvance,
  EmployeeSalary,
  UserManagement,
  Treatment,
  CureTracking,
  Deworming,
  BodyWeight,
  BodyTemperature,
  BodyConditionScore,
  HoofTrimming,
  Shearing,
  FeedRecipeList,
  FeedRecipeForm,
  ApplyRecipe,
  VaccineList,
  CreateVaccine,
  ApplyVaccine,
  ApplicationHistory,
  AuditLogs
} from './pages';

// Loading skeleton component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }} />
      <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);
 
// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const { user, isLoading } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Show toast feedback before redirecting
    return <Navigate to="/dashboard/animals" replace />;
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
    <ErrorBoundary>
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
          <Route
            index
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Capital (Admin only) */}
          <Route
            path="capital"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Capital />
              </ProtectedRoute>
            }
          />

          {/* Liability - Loans we borrow (Admin only) */}
          <Route
            path="liabilities"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Liability />
              </ProtectedRoute>
            }
          />
          
          {/* Animals */}
          <Route path="animals" element={<AnimalList />} />
          <Route path="animals/add" element={<AnimalForm />} />
          <Route path="animals/bulk-upload" element={<BulkUpload />} />
          <Route path="animals/move-to-pen" element={<MoveToPen />} />
          <Route path="animals/declare-dead" element={<DeclareAnimalDead />} />
          <Route path="animals/sell" element={<ProtectedRoute allowedRoles={['Admin']}><SellAnimal /></ProtectedRoute>} />
          <Route path="animals/:id" element={<AnimalForm />} />
          <Route path="animals/:id/edit" element={<AnimalForm />} />
          
          {/* Pens */}
          <Route path="pens" element={<PenList />} />
          <Route path="pens/add" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><PenForm /></ProtectedRoute>} />
          <Route path="pens/:id" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><PenForm /></ProtectedRoute>} />
          <Route path="pens/:id/edit" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><PenForm /></ProtectedRoute>} />
          
          {/* Stock */}
          <Route path="stock" element={<StockOverview />} />
          <Route path="stock/medication" element={<StockMedicationList />} />
          <Route path="stock/medication/add" element={<StockMedicationForm />} />
          <Route path="stock/medication/bulk-upload" element={<StockMedicationBulkUpload />} />
          <Route path="stock/feeding" element={<StockFeedingList />} />
          <Route path="stock/feeding/add" element={<StockFeedingForm />} />
          <Route path="stock/feeding/bulk-upload" element={<StockFeedingBulkUpload />} />
          <Route path="stock/assets" element={<StockAssetList />} />
          <Route path="stock/assets/add" element={<StockAssetForm />} />
          <Route path="stock/:id/edit" element={<StockEdit />} />
          
          {/* Employees (Admin only) */}
          <Route
            path="employees"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <EmployeeList />
              </ProtectedRoute>
            }
          />
          <Route
            path="employees/add"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <EmployeeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="employees/advances"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <EmployeeAdvance />
              </ProtectedRoute>
            }
          />
          <Route
            path="employees/salaries"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <EmployeeSalary />
              </ProtectedRoute>
            }
          />
          <Route
            path="employees/users"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="employees/:id"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <EmployeeForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="employees/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <EmployeeForm />
              </ProtectedRoute>
            }
          />
          
          {/* Health & Veterinary */}
          <Route path="health/treatment" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><Treatment /></ProtectedRoute>} />
          <Route path="health/cure-tracking" element={<CureTracking />} />
          <Route path="health/deworming" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><Deworming /></ProtectedRoute>} />
          <Route path="health/body-weight" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><BodyWeight /></ProtectedRoute>} />
          <Route path="health/body-temperature" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><BodyTemperature /></ProtectedRoute>} />
          <Route path="health/bcs" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><BodyConditionScore /></ProtectedRoute>} />
          <Route path="health/hoof-trimming" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><HoofTrimming /></ProtectedRoute>} />
          <Route path="health/shearing" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><Shearing /></ProtectedRoute>} />
          
          {/* Feed & Recipe Management */}
          <Route path="feed/recipes" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><FeedRecipeList /></ProtectedRoute>} />
          <Route path="feed/recipes/add" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><FeedRecipeForm /></ProtectedRoute>} />
          <Route path="feed/recipes/:id/edit" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><FeedRecipeForm /></ProtectedRoute>} />
          <Route path="feed/apply" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ApplyRecipe /></ProtectedRoute>} />

          {/* Vaccination Management */}
          <Route path="vaccination/vaccines" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><VaccineList /></ProtectedRoute>} />
          <Route path="vaccination/vaccines/add" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><CreateVaccine /></ProtectedRoute>} />
          <Route path="vaccination/vaccines/:id/edit" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><CreateVaccine /></ProtectedRoute>} />
          <Route path="vaccination/apply" element={<ProtectedRoute allowedRoles={['Admin', 'Manager']}><ApplyVaccine /></ProtectedRoute>} />
          <Route path="vaccination/history" element={<ApplicationHistory />} />

          {/* Admin */}
          <Route
            path="admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 404 - Redirect based on auth status */}
        <Route path="*" element={
          localStorage.getItem('token')
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        } />
      </Routes>
      </>
    </ErrorBoundary>
  );
}

export default App;
