import React from 'react';
import StockCategoryBulkUpload from './StockCategoryBulkUpload';

const StockMedicationBulkUpload = () => (
  <StockCategoryBulkUpload
    category="Medication"
    title="Medication"
    unit="ml"
    unitLabel="ml / unit"
    showUnitSize
  />
);

export default StockMedicationBulkUpload;
