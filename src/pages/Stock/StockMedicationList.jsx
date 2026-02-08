import React from 'react';
import StockCategoryList from './StockCategoryList';

const StockMedicationList = () => (
  <StockCategoryList
    category="Medication"
    title="Medication"
    addPath="/dashboard/stock/medication/add"
    bulkUploadPath="/dashboard/stock/medication/bulk-upload"
  />
);

export default StockMedicationList;
