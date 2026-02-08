import React from 'react';
import StockCategoryList from './StockCategoryList';

const StockAccessoryList = () => (
  <StockCategoryList
    category="Farm Accessories"
    title="Farm Accessories"
    addPath="/dashboard/stock/farm-accessories/add"
  />
);

export default StockAccessoryList;
