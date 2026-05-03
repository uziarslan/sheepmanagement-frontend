import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineCurrencyDollar,
  HiOutlinePlus,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineCalendar,
  HiOutlineDocumentAdd,
  HiOutlineExternalLink
} from 'react-icons/hi';
import { capitalAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { PARTNERS, PARTNER_OPTIONS } from '../../constants';
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
    description: '',
    partner1: '',
    partner2: '',
    retainedEarnings: '',
    investmentSubtype: ''
  });
  const [filters, setFilters] = useState({
    query: '',
    type: '',
    flow: '',
    fromDate: '',
    toDate: ''
  });

  const investmentSubtypes = [
    ...PARTNER_OPTIONS,
    { value: 'Retained Earnings', label: 'Retained Earnings' }
  ];
  const [errors, setErrors] = useState({});
  const [uploadingId, setUploadingId] = useState(null);
  const [pendingUploadTransactionId, setPendingUploadTransactionId] = useState(null);
  const fileInputRef = useRef(null);

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;

  const transactionTypes = [
    { value: 'Additional Investment', label: 'Additional Investment' },
    { value: 'Investment Withdrawal', label: 'Investment Withdrawal (Deduction)' },
    { value: 'Animal Purchase', label: 'Animal Purchase (Deduction)' },
    { value: 'Stock Purchase', label: 'Stock Purchase (Deduction)' },
    { value: 'Salaries', label: 'Salaries (Deduction)' },
    { value: 'Infrastructure', label: 'Infrastructure (Deduction)' },
    { value: 'Animal Sale', label: 'Animal Sale (Addition)' },
    { value: 'Other Expense', label: 'Other Expense (Deduction)' },
    { value: 'Other Income', label: 'Other Income (Addition)' },
    { value: 'Maintenance', label: 'Maintenance (Deduction)' },
    { value: 'Utilities', label: 'Utilities (Deduction)' },
    { value: 'Transportation', label: 'Transportation (Deduction)' },
    { value: 'Veterinary', label: 'Veterinary (Deduction)' }
  ];

  const transactionFlowOptions = [
    { value: 'addition', label: 'Addition' },
    { value: 'deduction', label: 'Deduction' }
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      type: '',
      flow: '',
      fromDate: '',
      toDate: ''
    });
  };

  const validate = () => {
    const newErrors = {};

    if (modalType === 'initial') {
      const p1 = parseFloat(formData.partner1) || 0;
      const p2 = parseFloat(formData.partner2) || 0;
      const re = parseFloat(formData.retainedEarnings) || 0;
      if (p1 + p2 + re <= 0) {
        newErrors.partner1 = 'Enter at least one amount to set initial capital';
      }
    } else {
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        newErrors.amount = 'Please enter a valid amount';
      }
      if (!formData.type) {
        newErrors.type = 'Please select a transaction type';
      }
      if (['Additional Investment', 'Investment Withdrawal'].includes(formData.type) && !formData.investmentSubtype) {
        newErrors.investmentSubtype = formData.type === 'Additional Investment'
          ? 'Please select who is investing'
          : 'Please select whose investment to deduct from';
      }
      if (formData.type === 'Investment Withdrawal' && formData.investmentSubtype && formData.amount) {
        const amt = parseFloat(formData.amount);
        const p1 = capital?.partner1Capital ?? 0;
        const p2 = capital?.partner2Capital ?? 0;
        const re = capital?.retainedEarningsCapital ?? 0;
        let maxWithdraw = 0;
        if (formData.investmentSubtype === PARTNERS.PARTNER_1) maxWithdraw = p1;
        else if (formData.investmentSubtype === PARTNERS.PARTNER_2) maxWithdraw = p2;
        else if (formData.investmentSubtype === 'Retained Earnings') maxWithdraw = re;
        if (amt > maxWithdraw) {
          newErrors.amount = `Cannot exceed balance (Rs.${maxWithdraw.toLocaleString()})`;
        }
      }
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
        const partner1 = parseFloat(formData.partner1) || 0;
        const partner2 = parseFloat(formData.partner2) || 0;
        const retainedEarnings = parseFloat(formData.retainedEarnings) || 0;
        await capitalAPI.setInitial({ partner1, partner2, retainedEarnings });
        toast.success('Initial capital set successfully');
      } else {
        // Determine if it's an addition or deduction
        const isAddition = ['Additional Investment', 'Animal Sale', 'Other Income'].includes(formData.type);
        const amount = isAddition ? parseFloat(formData.amount) : -parseFloat(formData.amount);
        const investmentSubtype = ['Additional Investment', 'Investment Withdrawal'].includes(formData.type)
          ? formData.investmentSubtype
          : null;
        await capitalAPI.update(amount, formData.type, formData.description, investmentSubtype);
        toast.success('Capital updated successfully');
      }

      fetchCapital();
      setModalOpen(false);
      setFormData({ amount: '', type: '', description: '', partner1: '', partner2: '', retainedEarnings: '', investmentSubtype: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to update capital');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (type) => {
    setModalType(type);
    setFormData({ amount: '', type: '', description: '', partner1: '', partner2: '', retainedEarnings: '', investmentSubtype: '' });
    setErrors({});
    setModalOpen(true);
  };

  const triggerInvoiceUpload = (transaction) => {
    setPendingUploadTransactionId(getId(transaction));
    fileInputRef.current?.click();
  };

  const handleInvoiceFileChange = async (e) => {
    const file = e.target.files?.[0];
    const transactionId = pendingUploadTransactionId;
    setPendingUploadTransactionId(null);
    e.target.value = '';

    if (!file || !transactionId) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image (JPEG, PNG, WebP) or PDF file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB.');
      return;
    }

    setUploadingId(transactionId);
    try {
      const response = await capitalAPI.uploadInvoice(transactionId, file);
      if (response.success) {
        toast.success('Invoice uploaded successfully');
        setCapital(response.data);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to upload invoice');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const history = capital?.history || [];
  const filteredHistory = history
    .slice()
    .reverse()
    .filter((transaction) => {
      const query = filters.query.trim().toLowerCase();
      const matchesQuery = !query || [
        transaction.type,
        transaction.description,
        transaction.investmentSubtype
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query));

      const matchesType = !filters.type || transaction.type === filters.type;

      const matchesFlow = !filters.flow
        || (filters.flow === 'addition' && transaction.amount > 0)
        || (filters.flow === 'deduction' && transaction.amount < 0);

      const transactionDate = transaction.date ? new Date(transaction.date) : null;
      const fromBoundary = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
      const toBoundary = filters.toDate ? new Date(`${filters.toDate}T23:59:59.999`) : null;

      const matchesFromDate = !fromBoundary || (transactionDate && transactionDate >= fromBoundary);
      const matchesToDate = !toBoundary || (transactionDate && transactionDate <= toBoundary);

      return matchesQuery && matchesType && matchesFlow && matchesFromDate && matchesToDate;
    });

  const totals = filteredHistory.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount) || 0;
      if (amount > 0) {
        acc.totalAddition += amount;
      } else if (amount < 0) {
        acc.totalDeduction += Math.abs(amount);
      }
      return acc;
    },
    { totalAddition: 0, totalDeduction: 0 }
  );
  const overallTotal = totals.totalAddition - totals.totalDeduction;

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
      <div className="space-y-6">
        {/* Total Capital — hero card full width with subdivisions */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 overflow-hidden">
          <div className="text-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <HiOutlineCurrencyDollar className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-emerald-100 font-medium text-sm uppercase tracking-wide">Total Capital</p>
                  <p className="text-3xl sm:text-4xl font-bold mt-1">{formatCurrency(capital?.totalCapital)}</p>
                </div>
              </div>
              <p className="text-emerald-100/90 text-sm sm:text-base border-t sm:border-t-0 sm:border-l border-white/20 pt-4 sm:pt-0 sm:pl-6">
                Last updated: {formatDate(capital?.lastUpdated)}
              </p>
            </div>
            {/* Subdivisions - legacy data without breakdown shows total as Retained Earnings */}
            {(() => {
              const p1 = capital?.partner1Capital ?? 0;
              const p2 = capital?.partner2Capital ?? 0;
              const re = capital?.retainedEarningsCapital ?? 0;
              const hasBreakdown = p1 + p2 + re > 0;
              const displayRe = hasBreakdown ? re : (capital?.totalCapital ?? 0);
              return (
                <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/10 rounded-lg px-4 py-3">
                    <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide">{PARTNERS.PARTNER_1}</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(p1)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-4 py-3">
                    <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide">{PARTNERS.PARTNER_2}</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(p2)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg px-4 py-3">
                    <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide">Retained Earnings</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(displayRe)}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Balance, P&L, Invested, Profit, Loss — grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
            <div className="text-white p-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-blue-100 font-medium text-sm">Available Balance</p>
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <HiOutlineTrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency((capital?.availableAmount ?? 0) + (capital?.loss ?? 0))}
              </p>
              <p className="text-blue-100 text-xs mt-2">
                Actual cash in hand (before loss deduction)
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600">
            <div className="text-white p-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-cyan-100 font-medium text-sm">P&L Balance</p>
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <HiOutlineTrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(capital?.availableAmount)}</p>
              <p className="text-cyan-100 text-xs mt-2">
                {capital?.totalCapital > 0
                  ? `${((capital?.availableAmount / capital?.totalCapital) * 100).toFixed(1)}% available`
                  : '0% available'}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
            <div className="text-white p-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-purple-100 font-medium text-sm">Invested Amount</p>
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <HiOutlineTrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(capital?.investedAmount)}</p>
              <p className="text-purple-100 text-xs mt-2">
                {capital?.totalCapital > 0
                  ? `${((capital?.investedAmount / capital?.totalCapital) * 100).toFixed(1)}% invested`
                  : '0% invested'}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600">
            <div className="text-white p-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-green-100 font-medium text-sm">Profit</p>
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <HiOutlineTrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(capital?.profit ?? 0)}</p>
              <p className="text-green-100 text-xs mt-2">
                From animal sales after covering loss
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600">
            <div className="text-white p-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-red-100 font-medium text-sm">Loss</p>
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <HiOutlineTrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(capital?.loss ?? 0)}</p>
              <p className="text-red-100 text-xs mt-2">
                From dead animals; covered by sale profit first
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Hidden file input for invoice upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleInvoiceFileChange}
      />

      {/* Transaction History */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Transaction History</h3>
            <p className="text-sm text-gray-500">All capital movements and transactions</p>
          </div>
          <p className="text-sm text-gray-500">
            {filteredHistory.length} of {history.length} shown
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Input
            name="query"
            value={filters.query}
            onChange={handleFilterChange}
            placeholder="Search by type or description"
          />
          <Select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            options={transactionTypes}
            placeholder="All types"
          />
          <Select
            name="flow"
            value={filters.flow}
            onChange={handleFilterChange}
            options={transactionFlowOptions}
            placeholder="All flows"
          />
          <Input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            onChange={handleFilterChange}
            placeholder="From date"
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
              placeholder="To date"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Reset
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Total Addition</p>
            <p className="text-lg font-bold text-green-700 mt-1">{formatCurrency(totals.totalAddition)}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Total Deduction</p>
            <p className="text-lg font-bold text-red-700 mt-1">{formatCurrency(totals.totalDeduction)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Overall Total</p>
            <p className={`text-lg font-bold mt-1 ${overallTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {overallTotal >= 0 ? '+' : ''}{formatCurrency(overallTotal)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {history.length === 0 ? (
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
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <HiOutlineCurrencyDollar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions match the selected filters</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            filteredHistory.map((transaction) => (
              <div
                key={getId(transaction)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors gap-4"
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    transaction.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {transaction.amount > 0 ? (
                      <HiOutlineTrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <HiOutlineTrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {transaction.type}
                      {transaction.investmentSubtype && (
                        <span className="text-gray-500 font-normal ml-1">({transaction.investmentSubtype})</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{transaction.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className={`font-semibold ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 mt-1 justify-end">
                      <HiOutlineCalendar className="w-4 h-4 mr-1 shrink-0" />
                      {formatDate(transaction.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {transaction.invoiceUrl ? (
                      <a
                        href={transaction.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <HiOutlineExternalLink className="w-4 h-4" />
                        View Invoice
                      </a>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      icon={HiOutlineDocumentAdd}
                      onClick={() => triggerInvoiceUpload(transaction)}
                      disabled={uploadingId === getId(transaction)}
                      loading={uploadingId === getId(transaction)}
                    >
                      {transaction.invoiceUrl ? 'Change' : 'Upload Invoice'}
                    </Button>
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
          {modalType === 'initial' ? (
            <>
              <Input
                label={PARTNERS.PARTNER_1}
                type="number"
                name="partner1"
                value={formData.partner1}
                onChange={handleChange}
                placeholder="Enter amount"
                prefix="Rs."
                error={errors.partner1}
                min={0}
              />
              <Input
                label={PARTNERS.PARTNER_2}
                type="number"
                name="partner2"
                value={formData.partner2}
                onChange={handleChange}
                placeholder="Enter amount"
                prefix="Rs."
                error={errors.partner2}
                min={0}
              />
              <Input
                label="Retained Earnings"
                type="number"
                name="retainedEarnings"
                value={formData.retainedEarnings}
                onChange={handleChange}
                placeholder="Enter amount"
                prefix="Rs."
                error={errors.retainedEarnings}
                min={0}
              />
              <p className="text-sm text-gray-500">
                Total: {formatCurrency(
                  (parseFloat(formData.partner1) || 0) +
                  (parseFloat(formData.partner2) || 0) +
                  (parseFloat(formData.retainedEarnings) || 0)
                )}
              </p>
            </>
          ) : (
            <>
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
            </>
          )}

          {modalType === 'add' && (
            <>
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
              {(formData.type === 'Additional Investment' || formData.type === 'Investment Withdrawal') && (
                <Select
                  label={formData.type === 'Additional Investment' ? 'Investment Type' : 'Deduct From'}
                  name="investmentSubtype"
                  value={formData.investmentSubtype}
                  onChange={handleChange}
                  options={(() => {
                    const p1 = capital?.partner1Capital ?? 0;
                    const p2 = capital?.partner2Capital ?? 0;
                    const re = capital?.retainedEarningsCapital ?? 0;
                    const hasSub = p1 + p2 + re > 0;
                    const legacyRe = !hasSub && (capital?.totalCapital ?? 0) > 0 ? capital.totalCapital : 0;
                    return investmentSubtypes.map(s => {
                      let bal = 0;
                      if (s.value === PARTNERS.PARTNER_1) bal = p1;
                      else if (s.value === PARTNERS.PARTNER_2) bal = p2;
                      else if (s.value === 'Retained Earnings') bal = hasSub ? re : legacyRe;
                      return {
                        value: s.value,
                        label: formData.type === 'Investment Withdrawal' ? `${s.label} (Rs.${bal.toLocaleString()})` : s.label
                      };
                    });
                  })()}
                  placeholder={formData.type === 'Additional Investment' ? 'Select who is investing' : 'Select whose investment to deduct'}
                  error={errors.investmentSubtype}
                  required
                />
              )}
            </>
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
              ['Additional Investment', 'Animal Sale', 'Other Income'].includes(formData.type)
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              <p className="text-sm font-medium">
                {['Additional Investment', 'Animal Sale', 'Other Income'].includes(formData.type)
                  ? '↑ This will ADD to your available balance'
                  : formData.type === 'Investment Withdrawal'
                    ? '↓ This will DEDUCT from the selected partner\'s investment and your available balance'
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
