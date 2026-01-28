import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineCurrencyDollar,
  HiOutlinePlus,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineCalendar
} from 'react-icons/hi';
import { capitalAPI } from '../../services/mockApi';
import { formatCurrency, formatDate } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea
} from '../../components/common';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const Capital = () => {
  const [capital, setCapital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'initial'
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    type: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  const transactionTypes = [
    { value: 'Investment', label: 'Add Investment' },
    { value: 'Animal Purchase', label: 'Animal Purchase (Deduction)' },
    { value: 'Stock Purchase', label: 'Stock Purchase (Deduction)' },
    { value: 'Salaries', label: 'Salaries (Deduction)' },
    { value: 'Infrastructure', label: 'Infrastructure (Deduction)' },
    { value: 'Sale Revenue', label: 'Sale Revenue (Addition)' },
    { value: 'Other Expense', label: 'Other Expense (Deduction)' },
    { value: 'Other Income', label: 'Other Income (Addition)' }
  ];

  useEffect(() => {
    fetchCapital();
  }, []);

  const fetchCapital = async () => {
    try {
      const response = await capitalAPI.get();
      if (response.success) {
        setCapital(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch capital data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    
    if (modalType === 'add' && !formData.type) {
      newErrors.type = 'Please select a transaction type';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (modalType === 'initial') {
        await capitalAPI.setInitial(parseFloat(formData.amount));
        toast.success('Initial capital set successfully');
      } else {
        // Determine if it's an addition or deduction
        const isAddition = ['Investment', 'Sale Revenue', 'Other Income'].includes(formData.type);
        const amount = isAddition ? parseFloat(formData.amount) : -parseFloat(formData.amount);
        
        await capitalAPI.update(amount, formData.type, formData.description);
        toast.success('Capital updated successfully');
      }
      
      fetchCapital();
      setModalOpen(false);
      setFormData({ amount: '', type: '', description: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to update capital');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setFormData({ amount: '', type: '', description: '' });
    setErrors({});
    setModalOpen(true);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capital Management"
        subtitle="Track and manage your farm's capital and investments"
        breadcrumbs={[{ label: 'Capital' }]}
        action={
          <div className="flex gap-3">
            <Button
              variant="outline"
              icon={HiOutlineCurrencyDollar}
              onClick={() => openModal('initial')}
            >
              Set Initial Capital
            </Button>
            <Button
              icon={HiOutlinePlus}
              onClick={() => openModal('add')}
            >
              Add Transaction
            </Button>
          </div>
        }
      />

      {/* Capital Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <div className="flex items-center justify-between mb-4">
              <p className="text-emerald-100 font-medium">Total Capital</p>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <HiOutlineCurrencyDollar className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(capital?.totalCapital)}</p>
            <p className="text-emerald-100 text-sm mt-2">
              Last updated: {formatDate(capital?.lastUpdated)}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <div className="flex items-center justify-between mb-4">
              <p className="text-blue-100 font-medium">Available Balance</p>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <HiOutlineTrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(capital?.availableAmount)}</p>
            <p className="text-blue-100 text-sm mt-2">
              {capital?.totalCapital > 0 
                ? `${((capital?.availableAmount / capital?.totalCapital) * 100).toFixed(1)}% available`
                : '0% available'
              }
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <div className="flex items-center justify-between mb-4">
              <p className="text-purple-100 font-medium">Invested Amount</p>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <HiOutlineTrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(capital?.investedAmount)}</p>
            <p className="text-purple-100 text-sm mt-2">
              {capital?.totalCapital > 0 
                ? `${((capital?.investedAmount / capital?.totalCapital) * 100).toFixed(1)}% invested`
                : '0% invested'
              }
            </p>
          </div>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Transaction History</h3>
            <p className="text-sm text-gray-500">All capital movements and transactions</p>
          </div>
        </div>

        <div className="space-y-4">
          {capital?.history?.length === 0 ? (
            <div className="text-center py-12">
              <HiOutlineCurrencyDollar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => openModal('initial')}
              >
                Set Initial Capital
              </Button>
            </div>
          ) : (
            capital?.history?.slice().reverse().map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    transaction.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {transaction.amount > 0 ? (
                      <HiOutlineTrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <HiOutlineTrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.type}</p>
                    <p className="text-sm text-gray-500">{transaction.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </p>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <HiOutlineCalendar className="w-4 h-4 mr-1" />
                    {formatDate(transaction.date)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'initial' ? 'Set Initial Capital' : 'Add Transaction'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Amount"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Enter amount"
            prefix="Rs."
            error={errors.amount}
            required
          />

          {modalType === 'add' && (
            <Select
              label="Transaction Type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={transactionTypes}
              placeholder="Select transaction type"
              error={errors.type}
              required
            />
          )}

          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter description (optional)"
            rows={3}
          />

          {modalType === 'add' && formData.type && (
            <div className={`p-3 rounded-lg ${
              ['Investment', 'Sale Revenue', 'Other Income'].includes(formData.type)
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              <p className="text-sm font-medium">
                {['Investment', 'Sale Revenue', 'Other Income'].includes(formData.type)
                  ? '↑ This will ADD to your available balance'
                  : '↓ This will DEDUCT from your available balance'
                }
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
            >
              {modalType === 'initial' ? 'Set Capital' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Capital;
