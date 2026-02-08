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
  BulkUpload,
  MoveToPen,
  PenList,
  PenForm,
  StockOverview,
  StockMedicationList,
  StockFeedingList,
  StockAccessoryList,
  StockMedicationForm,
  StockFeedingForm,
  StockAccessoryForm,
  StockMedicationBulkUpload,
  StockFeedingBulkUpload,
  StockEdit,
  EmployeeList,
  EmployeeForm,
  EmployeeAdvance,
  Treatment,
  CureTracking,
  Deworming,
  BodyWeight,
  BodyConditionScore,
  HoofTrimming,
  FeedRecipeList,
  FeedRecipeForm,
  ApplyRecipe,
  VaccineList,
  CreateVaccine,
  ApplyVaccine,
  ApplicationHistory
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
          <Route path="animals/bulk-upload" element={<BulkUpload />} />
          <Route path="animals/move-to-pen" element={<MoveToPen />} />
          <Route path="animals/:id" element={<AnimalForm />} />
          <Route path="animals/:id/edit" element={<AnimalForm />} />
          
          {/* Pens */}
          <Route path="pens" element={<PenList />} />
          <Route path="pens/add" element={<PenForm />} />
          <Route path="pens/:id" element={<PenForm />} />
          <Route path="pens/:id/edit" element={<PenForm />} />
          
          {/* Stock */}
          <Route path="stock" element={<StockOverview />} />
          <Route path="stock/medication" element={<StockMedicationList />} />
          <Route path="stock/medication/add" element={<StockMedicationForm />} />
          <Route path="stock/medication/bulk-upload" element={<StockMedicationBulkUpload />} />
          <Route path="stock/feeding" element={<StockFeedingList />} />
          <Route path="stock/feeding/add" element={<StockFeedingForm />} />
          <Route path="stock/feeding/bulk-upload" element={<StockFeedingBulkUpload />} />
          <Route path="stock/farm-accessories" element={<StockAccessoryList />} />
          <Route path="stock/farm-accessories/add" element={<StockAccessoryForm />} />
          <Route path="stock/:id/edit" element={<StockEdit />} />
          
          {/* Employees */}
          <Route path="employees" element={<EmployeeList />} />
          <Route path="employees/add" element={<EmployeeForm />} />
          <Route path="employees/advances" element={<EmployeeAdvance />} />
          <Route path="employees/:id" element={<EmployeeForm />} />
          <Route path="employees/:id/edit" element={<EmployeeForm />} />
          
          {/* Health & Veterinary */}
          <Route path="health/treatment" element={<Treatment />} />
          <Route path="health/cure-tracking" element={<CureTracking />} />
          <Route path="health/deworming" element={<Deworming />} />
          <Route path="health/body-weight" element={<BodyWeight />} />
          <Route path="health/bcs" element={<BodyConditionScore />} />
          <Route path="health/hoof-trimming" element={<HoofTrimming />} />
          
          {/* Feed & Recipe Management */}
          <Route path="feed/recipes" element={<FeedRecipeList />} />
          <Route path="feed/recipes/add" element={<FeedRecipeForm />} />
          <Route path="feed/recipes/:id/edit" element={<FeedRecipeForm />} />
          <Route path="feed/apply" element={<ApplyRecipe />} />
          
          {/* Vaccination Management */}
          <Route path="vaccination/vaccines" element={<VaccineList />} />
          <Route path="vaccination/vaccines/add" element={<CreateVaccine />} />
          <Route path="vaccination/vaccines/:id/edit" element={<CreateVaccine />} />
          <Route path="vaccination/apply" element={<ApplyVaccine />} />
          <Route path="vaccination/history" element={<ApplicationHistory />} />
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
