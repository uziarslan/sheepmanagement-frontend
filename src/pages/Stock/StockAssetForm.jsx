import React from 'react';
import StockCategoryForm from './StockCategoryForm';

const assetTypes = [
  { value: 'Building', label: 'Building' },
  { value: 'Machinery', label: 'Machinery' },
  { value: 'Others', label: 'Others' }
];

const StockAssetForm = () => (
  <StockCategoryForm
    category="Assets"
    title="Asset"
    unit="nos"
    unitLabel="Unit Size"
    showUnitSize={false}
    assetTypes={assetTypes}
    defaultPackQuantity="1"
  />
);

export default StockAssetForm;
