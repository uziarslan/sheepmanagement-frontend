import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineShoppingCart,
  HiOutlineArrowLeft,
  HiOutlineUpload,
  HiOutlineDownload
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import * as XLSX from 'xlsx';
import { animalAPI } from '../../services/mockApi';
import { formatCurrency } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Select,
  Input,
  Badge
} from '../../components/common';
import { ConfirmDialog } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const SellAnimal = () => {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('single');

  // Single animal sale
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [saleData, setSaleData] = useState({
    sellingPrice: '',
    soldDate: new Date().toISOString().split('T')[0]
  });
  const [confirmModal, setConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Bulk upload
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkTotalSellingPrice, setBulkTotalSellingPrice] = useState('');
  const [bulkSoldDate, setBulkSoldDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchActiveAnimals();
  }, []);

  const fetchActiveAnimals = async () => {
    try {
      const response = await animalAPI.getAll({ status: 'Active' });
      if (response.success) {
        setAnimals(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch animals');
    } finally {
      setLoading(false);
    }
  };

  // ============ SINGLE ANIMAL SALE ============

  const handleAnimalSelect = (e) => {
    const animalId = e.target.value;
    setSelectedAnimalId(animalId);
    const animal = animals.find(a => (a._id || a.id) === animalId);
    setSelectedAnimal(animal);
    setResult(null);
    setSaleData({ sellingPrice: '', soldDate: new Date().toISOString().split('T')[0] });
  };

  const handleSaleInputChange = (e) => {
    const { name, value } = e.target;
    setSaleData(prev => ({ ...prev, [name]: value }));
  };

  const calculateProfit = () => {
    if (!selectedAnimal || !saleData.sellingPrice) return 0;
    const totalCost = (selectedAnimal.purchasePrice || 0) + (selectedAnimal.cost || 0);
    return parseFloat(saleData.sellingPrice) - totalCost;
  };

  const getTotalCost = () => {
    if (!selectedAnimal) return 0;
    return (selectedAnimal.purchasePrice || 0) + (selectedAnimal.cost || 0);
  };

  const handleSinglesaleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAnimalId) {
      toast.error('Please select an animal');
      return;
    }
    if (!saleData.sellingPrice) {
      toast.error('Please enter selling price');
      return;
    }
    if (parseFloat(saleData.sellingPrice) <= 0) {
      toast.error('Selling price must be greater than 0');
      return;
    }
    setConfirmModal(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const response = await animalAPI.markAsSold(selectedAnimalId, saleData);
      if (response.success) {
        toast.success('Animal marked as sold successfully');
        setResult(response.data);
        setConfirmModal(false);
        setAnimals(prev => prev.filter(a => (a._id || a.id) !== selectedAnimalId));
        setSelectedAnimalId('');
        setSelectedAnimal(null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to process sale');
    } finally {
      setSubmitting(false);
      setConfirmModal(false);
    }
  };

  // ============ BULK UPLOAD ============

  const normalizeTagId = (value) => String(value ?? '').trim();

  /** Match file TagId to animal: exact match, or numeric value matches SHP-XXX */
  const findAnimalByTagId = (tagId) => {
    const normalized = normalizeTagId(tagId).toLowerCase();
    const exact = animals.find(a => (a.tagId || '').toString().toLowerCase() === normalized);
    if (exact) return exact;
    if (/^\d+$/.test(normalized)) {
      return animals.find(
        a =>
          String(a.tagId || '').toLowerCase() === `shp-${normalized}` ||
          String(a.tagId || '').endsWith(normalized)
      ) || null;
    }
    return null;
  };

  /** Display tagId consistently (e.g. 921 → SHP-921) to match All Animals */
  const formatTagIdForDisplay = (tagId) => {
    if (tagId == null) return '';
    const s = String(tagId).trim();
    if (/^\d+$/.test(s)) return `SHP-${s}`;
    return s;
  };

  const getAnimalTotalCost = (animal) => (animal?.purchasePrice || 0) + (animal?.cost || 0);

  const downloadBulkSaleTemplate = () => {
    try {
      const ws = XLSX.utils.aoa_to_sheet([
        ['TagId'],
        ['SHP-001']
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BulkSale');
      const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bulk-sale-template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const extractTagIdsFromRows = (rows) => {
    if (!rows || rows.length === 0) return [];

    const headerRow = (rows[0] || []).map(cell => String(cell ?? '').trim());
    const headerIndex = headerRow.findIndex(h => h.replace(/\s|_/g, '').toLowerCase() === 'tagid');
    const tagIdColIdx = headerIndex >= 0 ? headerIndex : 0;
    const startRowIdx = headerIndex >= 0 ? 1 : 0;

    const tagIds = [];
    for (let i = startRowIdx; i < rows.length; i++) {
      const row = rows[i] || [];
      const raw = row[tagIdColIdx];
      const tagId = normalizeTagId(raw);
      if (tagId) tagIds.push(tagId);
    }
    return tagIds;
  };

  const parseBulkTagFile = async (file) => {
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      let rows = [];

      if (ext === 'csv') {
        const text = await file.text();
        rows = text
          .split(/\r?\n/)
          .filter(line => line.trim().length > 0)
          .map(line => line.split(',').map(cell => cell.trim()));
      } else {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames?.[0];
        const ws = sheetName ? wb.Sheets[sheetName] : null;
        if (!ws) {
          toast.error('Invalid Excel file');
          return;
        }
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      }

      const rawTagIds = extractTagIdsFromRows(rows);
      if (rawTagIds.length === 0) {
        toast.error('No TagId found in file');
        setBulkPreview([]);
        return;
      }

      // Dedupe while preserving order
      const seen = new Set();
      const tagIds = [];
      for (const t of rawTagIds) {
        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        tagIds.push(t);
      }

      if (tagIds.length !== rawTagIds.length) {
        toast.success(`Removed ${rawTagIds.length - tagIds.length} duplicate TagId(s)`);
      }

      const preview = tagIds.map(tagId => {
        const animal = findAnimalByTagId(tagId);
        if (!animal) {
          return {
            tagId,
            status: 'error',
            message: 'Animal not found'
          };
        }
        return {
          animalId: animal._id || animal.id,
          tagId: animal.tagId,
          name: animal.name,
          weight: animal.weight || 0,
          purchasePrice: animal.purchasePrice || 0,
          costOperational: animal.cost || 0,
          totalCost: getAnimalTotalCost(animal),
          status: 'valid'
        };
      });

      setBulkPreview(preview);
      setBulkTotalSellingPrice('');
      setBulkResult(null);
    } catch (error) {
      toast.error('Failed to parse file');
    }
  };

  const handleBulkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkFile(file);
      setBulkPreview([]);
      setBulkResult(null);
      setBulkTotalSellingPrice('');
      parseBulkTagFile(file);
    }
  };

  const allocateTotalSellingPrice = (totalSellingPrice, count) => {
    // Allocate in "paise" to ensure sums match exactly (2 decimals)
    const totalPaise = Math.round((Number(totalSellingPrice) || 0) * 100);
    if (!count || count <= 0) return [];
    const base = Math.floor(totalPaise / count);
    const remainder = totalPaise % count;
    const allocations = new Array(count).fill(base);
    for (let i = 0; i < remainder; i++) allocations[i] += 1;
    return allocations.map(paise => paise / 100);
  };

  const getBulkCalculated = () => {
    const validRows = bulkPreview.filter(r => r.status === 'valid');
    const count = validRows.length;
    const total = Number(bulkTotalSellingPrice) || 0;
    const hasTotalSellingPrice = total > 0 && count > 0;

    const allocations = hasTotalSellingPrice ? allocateTotalSellingPrice(total, count) : [];
    let allocationIdx = 0;

    const rows = bulkPreview.map(row => {
      if (row.status !== 'valid') {
        return {
          ...row,
          basePrice: 0,
          basePricePerKg: 0,
          baseTotalPrice: 0,
          baseTotalPricePerKg: 0,
          salePrice: 0,
          salePricePerKg: 0,
          profit: null,
          costDisplay: 0
        };
      }

      const totalCost = row.totalCost || 0;
      const purchasePrice = row.purchasePrice ?? (row.totalCost || 0);
      const costOperational = row.costOperational ?? 0;
      const weight = Number(row.weight) || 0;

      // Base values (same meaning as All Animals tab)
      const basePrice = purchasePrice;
      const basePricePerKg = weight > 0 ? basePrice / weight : 0;
      const baseTotalPrice = totalCost;
      const baseTotalPricePerKg = weight > 0 ? baseTotalPrice / weight : 0;

      // Sale values (only when user enters total selling price)
      const salePrice = hasTotalSellingPrice ? (allocations[allocationIdx++] ?? 0) : 0;
      const salePricePerKg = weight > 0 ? salePrice / weight : 0;
      const profit = hasTotalSellingPrice ? salePrice - totalCost : null;

      return {
        ...row,
        basePrice,
        basePricePerKg,
        baseTotalPrice,
        baseTotalPricePerKg,
        salePrice,
        salePricePerKg,
        profit,
        costDisplay: costOperational
      };
    });

    const totalBasePrice = rows.reduce((sum, r) => sum + (r.baseTotalPrice || 0), 0);
    const totalSalePrice = hasTotalSellingPrice ? rows.reduce((sum, r) => sum + (r.salePrice || 0), 0) : 0;
    const totalCostSum = rows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalProfit = hasTotalSellingPrice
      ? rows.reduce((sum, r) => sum + (r.profit ?? 0), 0)
      : 0;
    const perAnimal = count > 0 && total > 0 ? total / count : 0;

    return {
      rows,
      totalBasePrice,
      totalSalePrice,
      totalCost: totalCostSum,
      totalProfit,
      perAnimal,
      validCount: count,
      hasTotalSellingPrice
    };
  };

  const handleBulkSaleSubmit = async () => {
    if (bulkPreview.length === 0) {
      toast.error('No valid animals in preview');
      return;
    }

    const { rows, validCount } = getBulkCalculated();
    const total = Number(bulkTotalSellingPrice) || 0;
    if (validCount === 0) {
      toast.error('No valid animals to process');
      return;
    }
    if (!total || total <= 0) {
      toast.error('Please enter total selling price (must be > 0)');
      return;
    }

    const validAnimals = rows
      .filter(item => item.status === 'valid')
      .map(item => ({
        animalId: item.animalId,
        tagId: item.tagId,
        sellingPrice: item.salePrice,
        soldDate: bulkSoldDate
      }));
    if (validAnimals.length === 0) {
      toast.error('No valid animals to process');
      return;
    }

    setBulkLoading(true);
    try {
      const response = await animalAPI.bulkMarkAsSold(validAnimals);
      if (response.success) {
        toast.success('Bulk sale processed successfully');
        setBulkResult(response.data);
        setBulkFile(null);
        setBulkPreview([]);
        setBulkTotalSellingPrice('');
        fetchActiveAnimals(); // Refresh the list
      }
    } catch (error) {
      toast.error(error.message || 'Failed to process bulk sale');
    } finally {
      setBulkLoading(false);
    }
  };

  const getTotalBulkRevenue = () => {
    const { totalSalePrice } = getBulkCalculated();
    return totalSalePrice;
  };

  const getTotalBulkProfit = () => {
    const { totalProfit } = getBulkCalculated();
    return totalProfit;
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sell Animals"
        subtitle="Record animal sales and track profit/loss"
        breadcrumbs={[
          { label: 'Animals', path: '/dashboard/animals' },
          { label: 'Sell Animals' }
        ]}
        action={
          <Button
            variant="outline"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/animals')}
          >
            Back to Animals
          </Button>
        }
      />

      {/* Tab Toggle */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'single' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('single')}
        >
          Single Animal Sale
        </Button>
        <Button
          variant={activeTab === 'bulk' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('bulk')}
        >
          Bulk Upload Sale
        </Button>
      </div>

      {/* SINGLE ANIMAL SALE */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Card */}
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <HiOutlineShoppingCart className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Record Sale</h3>
                  <p className="text-sm text-gray-500">Sell a single animal and track profit</p>
                </div>
              </div>

              <form onSubmit={handleSinglesaleSubmit} className="space-y-6">
                <Select
                  label="Select Animal"
                  name="animalId"
                  value={selectedAnimalId}
                  onChange={handleAnimalSelect}
                  options={animals.map(a => ({
                    value: a._id || a.id,
                    label: `${a.tagId} - ${a.name || 'Unnamed'} (${a.animalType})`
                  }))}
                  placeholder="Choose an animal..."
                  required
                />

                <Input
                  label="Selling Price"
                  type="number"
                  name="sellingPrice"
                  value={saleData.sellingPrice}
                  onChange={handleSaleInputChange}
                  placeholder="Enter selling price"
                  step="0.01"
                  min="0"
                  required
                />

                <Input
                  label="Sale Date"
                  type="date"
                  name="soldDate"
                  value={saleData.soldDate}
                  onChange={handleSaleInputChange}
                  required
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={!selectedAnimalId}
                  >
                    Record Sale
                  </Button>
                </div>
              </form>
            </Card>

            {/* Animal Preview Card */}
            <div className="space-y-6">
              {selectedAnimal && (
                <Card>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <GiSheep className="w-10 h-10 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedAnimal.name || 'Unnamed Animal'}
                      </h3>
                      <p className="text-gray-500">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">
                          {selectedAnimal.tagId}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">Type</p>
                      <p className="font-medium">{selectedAnimal.animalType}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">Weight</p>
                      <p className="font-medium">{selectedAnimal.weight} kg</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-4">Financial Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Purchase Price</span>
                        <span className="font-medium">{formatCurrency(selectedAnimal.purchasePrice || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Operational Cost</span>
                        <span className="font-medium">{formatCurrency(selectedAnimal.cost || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-3 mt-3">
                        <span className="font-semibold text-gray-900">Total Cost</span>
                        <span className="font-bold">{formatCurrency(getTotalCost())}</span>
                      </div>
                      {saleData.sellingPrice && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Selling Price</span>
                            <span className="font-medium text-blue-600">
                              {formatCurrency(parseFloat(saleData.sellingPrice) || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm border-t pt-3 mt-3">
                            <span className="font-semibold text-gray-900">Profit/Loss</span>
                            <span className={`font-bold ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(calculateProfit())}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Profit Margin</span>
                            <span className={`font-medium ${calculateProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {getTotalCost() > 0 ? ((calculateProfit() / getTotalCost()) * 100).toFixed(2) : 0}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {result && (
                <Card className="border-green-200 bg-green-50">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-green-800">Sale Recorded Successfully</h4>
                  </div>
                  <div className="space-y-2 text-sm text-green-700">
                    <p>Tag ID: <strong>{result.animal.tagId}</strong></p>
                    <p>Total Cost: <strong>{formatCurrency(result.totalCost)}</strong></p>
                    <p>Selling Price: <strong>{formatCurrency(result.sellingPrice)}</strong></p>
                    <p>Profit: <strong className={result.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(result.profit)}
                    </strong></p>
                  </div>
                </Card>
              )}

              {!selectedAnimal && !result && (
                <Card className="border-dashed border-2 border-gray-200">
                  <div className="text-center py-12">
                    <GiSheep className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Select an animal to view cost details</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* BULK UPLOAD */}
        {activeTab === 'bulk' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Card */}
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <HiOutlineUpload className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Upload</h3>
                  <p className="text-sm text-gray-500">Upload Excel/CSV with TagId only</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleBulkFileChange}
                    className="hidden"
                    id="bulk-file"
                  />
                  <label htmlFor="bulk-file" className="cursor-pointer">
                    <div className="text-center">
                      <HiOutlineUpload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900">
                        Click to upload file
                      </p>
                      <p className="text-xs text-gray-500">
                        {bulkFile ? bulkFile.name : 'CSV or Excel format'}
                      </p>
                    </div>
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">File Format</h4>
                      <p className="text-xs text-blue-700">
                        Excel/CSV with a single column: <strong>TagId</strong>
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Example: <span className="font-mono">SHP-001</span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      icon={HiOutlineDownload}
                      onClick={downloadBulkSaleTemplate}
                      className="shrink-0"
                    >
                      Template
                    </Button>
                  </div>
                </div>

                {bulkPreview.length > 0 && !bulkResult && (
                  <div className="space-y-3">
                    <Input
                      label="Total Selling Price (All Animals)"
                      type="number"
                      name="bulkTotalSellingPrice"
                      value={bulkTotalSellingPrice}
                      onChange={(e) => setBulkTotalSellingPrice(e.target.value)}
                      placeholder="Enter total selling price for all selected animals"
                      step="0.01"
                      min="0"
                      required
                    />
                    {Number(bulkTotalSellingPrice) > 0 && bulkPreview.filter(p => p.status === 'valid').length > 0 && (
                      <p className="text-xs text-gray-500 -mt-2">
                        Per animal selling price:{" "}
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(getBulkCalculated().perAnimal)}
                        </span>
                      </p>
                    )}

                    <Input
                      label="Sold Date"
                      type="date"
                      name="bulkSoldDate"
                      value={bulkSoldDate}
                      onChange={(e) => setBulkSoldDate(e.target.value)}
                      required
                    />
                  </div>
                )}

                {bulkPreview.length > 0 && (
                  <Button
                    onClick={handleBulkSaleSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={
                      bulkLoading ||
                      bulkPreview.filter(p => p.status === 'valid').length === 0 ||
                      !(Number(bulkTotalSellingPrice) > 0)
                    }
                  >
                    {bulkLoading
                      ? 'Processing...'
                      : Number(bulkTotalSellingPrice) > 0
                        ? `Process ${bulkPreview.filter(p => p.status === 'valid').length} Animals`
                        : 'Enter total selling price to continue'}
                  </Button>
                )}
              </div>
            </Card>

            {/* Preview & Results */}
            <Card className="lg:col-span-2">
              {bulkResult ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>

                  {bulkResult.success && bulkResult.success.length > 0 && (
                    <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                      <h4 className="font-medium text-green-900 mb-2">
                        {bulkResult.success.length} Successfully Sold
                      </h4>
                      <div className="space-y-2">
                        {bulkResult.success.map((item, idx) => (
                          <div key={idx} className="text-sm text-green-700 flex justify-between">
                            <span>{item.tagId}</span>
                            <span className="font-medium">Profit: {formatCurrency(item.profit)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bulkResult.failed && bulkResult.failed.length > 0 && (
                    <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                      <h4 className="font-medium text-red-900 mb-2">
                        {bulkResult.failed.length} Failed
                      </h4>
                      <div className="space-y-2">
                        {bulkResult.failed.map((item, idx) => (
                          <div key={idx} className="text-sm text-red-700">
                            {item.tagId || item.animalId}: {item.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : bulkPreview.length > 0 ? (
                <div className="space-y-4">
                  {(() => {
                    const calc = getBulkCalculated();
                    return (
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Preview ({bulkPreview.length} rows)
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {calc.validCount} valid animal(s)
                            {bulkTotalSellingPrice && calc.validCount > 0
                              ? ` • Allocated per animal ≈ ${formatCurrency(calc.perAnimal)}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Tag ID</th>
                          <th className="text-left py-2 px-3 font-semibold text-gray-700">Name</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Cost</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Price</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Price/Kg</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Total Price</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Total Price/Kg</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Sale Price</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Sale Price/Kg</th>
                          <th className="text-right py-2 px-3 font-semibold text-gray-700">Profit</th>
                          <th className="text-center py-2 px-3 font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getBulkCalculated().rows.map((item, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono text-xs">
                              {item.status === 'valid' ? formatTagIdForDisplay(item.tagId) : item.tagId}
                            </td>
                            <td className="py-2 px-3 text-sm">
                              {item.name || (item.status === 'error' ? item.message : '')}
                            </td>
                            <td className="py-2 px-3 text-right text-sm">
                              {formatCurrency(item.status === 'valid' ? (item.costDisplay ?? item.costOperational ?? 0) : 0)}
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-medium">{formatCurrency(item.basePrice || 0)}</td>
                            <td className="py-2 px-3 text-right text-sm">
                              {item.basePricePerKg ? formatCurrency(item.basePricePerKg) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-medium">{formatCurrency(item.baseTotalPrice || 0)}</td>
                            <td className="py-2 px-3 text-right text-sm">
                              {item.baseTotalPricePerKg ? formatCurrency(item.baseTotalPricePerKg) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-medium">
                              {getBulkCalculated().hasTotalSellingPrice ? formatCurrency(item.salePrice || 0) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right text-sm">
                              {getBulkCalculated().hasTotalSellingPrice
                                ? (item.salePricePerKg ? formatCurrency(item.salePricePerKg) : '-')
                                : '—'}
                            </td>
                            <td className={`py-2 px-3 text-right text-sm font-medium ${item.profit != null && item.profit >= 0 ? 'text-green-600' : item.profit != null ? 'text-red-600' : ''}`}>
                              {item.profit != null ? formatCurrency(item.profit) : '—'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant={item.status === 'valid' ? 'success' : 'error'}>
                                {item.status === 'valid' ? 'Valid' : 'Error'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">Sum of Total Price</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(getBulkCalculated().totalBasePrice)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">Total Selling Price</p>
                      <p className="text-lg font-bold text-indigo-600">{formatCurrency(getTotalBulkRevenue())}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <p className="text-xs text-green-600">Total Profit</p>
                      <p className={`text-lg font-bold ${getTotalBulkProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(getTotalBulkProfit())}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <HiOutlineUpload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Upload a file to preview animals</p>
                </div>
              )}
            </Card>
          </div>
        )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        onConfirm={handleConfirm}
        title="Confirm Animal Sale"
        message={
          selectedAnimal
            ? `Are you sure you want to mark "${selectedAnimal.name || selectedAnimal.tagId}" as sold for ${formatCurrency(parseFloat(saleData.sellingPrice) || 0)}? This action cannot be undone.`
            : 'Are you sure you want to proceed?'
        }
        confirmText="Confirm Sale"
        loading={submitting}
      />
    </div>
  );
};

export default SellAnimal;
