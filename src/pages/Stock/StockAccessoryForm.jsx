import React from 'react';
import StockCategoryForm from './StockCategoryForm';

const StockAccessoryForm = () => (
  <StockCategoryForm
    category="Farm Accessories"
    title="Farm Accessories"
    unit="nos"
    unitLabel="Unit Size"
    showUnitSize={false}
  />
);

export default StockAccessoryForm;
