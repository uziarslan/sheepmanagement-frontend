// Utility functions for the application

// Format number as Pakistani Rupees
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'Rs. 0';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('PKR', 'Rs.');
};

// Format number with commas (Pakistani style)
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-PK').format(num);
};

// Format date to readable string
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format date for input fields (YYYY-MM-DD)
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// Calculate age from birth date
export const calculateAge = (birthDate) => {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const today = new Date();
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
  }
  return `${months} month${months !== 1 ? 's' : ''}`;
};

// Days elapsed since the given date (createdAt, birthDate, etc.).
// Returns null when the input is missing/invalid.
export const calculateDaysSince = (date) => {
  if (!date) return null;
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) return null;
  const diffMs = Date.now() - start.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
};

// Generate Tag ID
export const generateTagId = (prefix = 'SHP', number) => {
  return `${prefix}-${String(number).padStart(3, '0')}`;
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Get status color classes
export const getStatusColor = (status) => {
  const colors = {
    'Active': 'bg-green-100 text-green-800',
    'Quarantine': 'bg-yellow-100 text-yellow-800',
    'Sold': 'bg-blue-100 text-blue-800',
    'Dead': 'bg-red-100 text-red-800',
    'Returned': 'bg-purple-100 text-purple-800',
    'Slaughtered': 'bg-gray-100 text-gray-800',
    'default': 'bg-gray-100 text-gray-600'
  };
  return colors[status] || colors.default;
};

// Get pen type color classes
export const getPenTypeColor = (type) => {
  const colors = {
    'Fattening': 'bg-emerald-100 text-emerald-800',
    'Production': 'bg-blue-100 text-blue-800',
    'Quarantine': 'bg-amber-100 text-amber-800',
    'Heifer': 'bg-pink-100 text-pink-800',
    'Dry': 'bg-gray-100 text-gray-800',
    'Close-up': 'bg-violet-100 text-violet-800',
    'default': 'bg-gray-100 text-gray-600'
  };
  return colors[type] || colors.default;
};

// Get stock category color classes
export const getStockCategoryColor = (category) => {
  const colors = {
    'Feeding': 'bg-green-100 text-green-800',
    'Medication': 'bg-red-100 text-red-800',
    'Semen': 'bg-blue-100 text-blue-800',
    'Seeds': 'bg-yellow-100 text-yellow-800',
    'Fertilizers': 'bg-orange-100 text-orange-800',
    'Pesticides': 'bg-purple-100 text-purple-800',
    'default': 'bg-gray-100 text-gray-600'
  };
  return colors[category] || colors.default;
};

// Validate CNIC format (XXXXX-XXXXXXX-X)
export const validateCNIC = (cnic) => {
  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
  return cnicRegex.test(cnic);
};

// Validate phone number (Pakistan format)
export const validatePhone = (phone) => {
  const phoneRegex = /^03\d{2}-\d{7}$/;
  return phoneRegex.test(phone);
};

// Validate email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Sort array by key
export const sortByKey = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Filter array by search term across multiple fields
export const filterBySearch = (array, searchTerm, fields) => {
  if (!searchTerm) return array;
  const term = searchTerm.toLowerCase();
  return array.filter(item =>
    fields.some(field => {
      const value = item[field];
      return value && value.toString().toLowerCase().includes(term);
    })
  );
};
