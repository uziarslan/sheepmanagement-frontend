import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { stockAPI } from '../../services/mockApi';
import { PageLoader } from '../../components/common/Spinner';
import StockMedicationForm from './StockMedicationForm';
import StockFeedingForm from './StockFeedingForm';
import StockAccessoryForm from './StockAccessoryForm';
import StockAssetForm from './StockAssetForm';

const StockEdit = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await stockAPI.getById(id);
        if (response.success) {
          setCategory(response.data?.category || null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [id]);

  if (loading) return <PageLoader />;

  if (category === 'Medication') return <StockMedicationForm />;
  if (category === 'Feeding') return <StockFeedingForm />;
  if (category === 'Assets') return <StockAssetForm />;
  return <StockAccessoryForm />;
};

export default StockEdit;
