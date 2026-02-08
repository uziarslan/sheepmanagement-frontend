import React from 'react';
import StockCategoryBulkUpload from './StockCategoryBulkUpload';

const StockFeedingBulkUpload = () => (
  <StockCategoryBulkUpload
    category="Feeding"
    title="Feeding"
    unit="kg"
    unitLabel="kg / unit"
    showUnitSize
  />
);

export default StockFeedingBulkUpload;
