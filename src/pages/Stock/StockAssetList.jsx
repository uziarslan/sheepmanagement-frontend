import React from 'react';
import StockCategoryList from './StockCategoryList';

const StockAssetList = () => (
  <StockCategoryList
    category="Assets"
    title="Assets"
    subtitle="Buildings, machinery, and other farm assets"
    addPath="/dashboard/stock/assets/add"
    showAssetType
  />
);

export default StockAssetList;
