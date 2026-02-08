import React from 'react';
import StockCategoryList from './StockCategoryList';

const StockFeedingList = () => (
  <StockCategoryList
    category="Feeding"
    title="Feeding"
    addPath="/dashboard/stock/feeding/add"
    bulkUploadPath="/dashboard/stock/feeding/bulk-upload"
  />
);

export default StockFeedingList;
