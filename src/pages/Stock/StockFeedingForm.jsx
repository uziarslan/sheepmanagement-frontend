import React from 'react';
import StockCategoryForm from './StockCategoryForm';

const StockFeedingForm = () => (
  <StockCategoryForm
    category="Feeding"
    title="Feeding"
    unit="kg"
    unitLabel="kg / unit"
    showUnitSize
  />
);

export default StockFeedingForm;
