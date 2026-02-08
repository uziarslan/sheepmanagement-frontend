import React from 'react';
import StockCategoryForm from './StockCategoryForm';

const StockMedicationForm = () => (
  <StockCategoryForm
    category="Medication"
    title="Medication"
    unit="ml"
    unitLabel="ml / unit"
    showUnitSize
  />
);

export default StockMedicationForm;
