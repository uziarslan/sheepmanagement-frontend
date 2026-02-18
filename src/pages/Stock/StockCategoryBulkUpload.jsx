import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  HiOutlineArrowLeft,
  HiOutlineCloudUpload,
  HiOutlineDocumentDownload,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineX
} from 'react-icons/hi';
import { stockAPI } from '../../services/mockApi';
import {
  PageHeader,
  Card,
  Button,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';

const StockCategoryBulkUpload = ({
  category,
  title,
  unit,
  unitLabel,
  showUnitSize = true
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const templateColumns = [
    { key: 'purchaseDate', label: 'Date', required: true, example: '2025-01-15' },
    { key: 'productName', label: 'Name', required: true, example: 'Albendazole' },
    { key: 'packQuantity', label: 'Quantity', required: true, example: '10' },
    ...(showUnitSize
      ? [{ key: 'unitSize', label: unitLabel, required: true, example: `100 ${unit}` }]
      : []),
    { key: 'totalPrice', label: 'Total Price', required: true, example: '5000' },
    { key: 'notes', label: 'Notes', required: false, example: 'Optional notes' }
  ];

  const downloadTemplate = () => {
    const worksheetData = [
      templateColumns.map(col => col.label),
      templateColumns.map(col => col.example)
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = templateColumns.map(() => ({ wch: 22 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');

    const instructionsData = [
      [`${title} Bulk Upload Instructions`],
      [''],
      ['Required Fields:'],
      ...templateColumns.filter(c => c.required).map(c => [`- ${c.label}`]),
      [''],
      ['Date Format: YYYY-MM-DD (e.g., 2025-01-15)'],
      ['Numbers only for Quantity, Unit Size, and Total Price']
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    XLSX.writeFile(workbook, `${title.toLowerCase().replace(/\s+/g, '_')}_bulk_upload_template.xlsx`);
    toast.success('Template downloaded successfully');
  };

  const validateRow = (row, index) => {
    const rowErrors = [];
    const validatedData = { ...row, rowIndex: index + 2 };

    templateColumns.forEach(col => {
      if (col.required && !row[col.key]?.toString().trim()) {
        rowErrors.push(`${col.label} is required`);
      }
    });

    if (row.purchaseDate) {
      const dateStr = row.purchaseDate.toString().trim();
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        rowErrors.push(`"${dateStr}" is not a valid date format. Use YYYY-MM-DD.`);
      } else {
        validatedData.purchaseDate = dateStr;
      }
    }

    if (row.packQuantity) {
      const qty = parseFloat(row.packQuantity);
      if (isNaN(qty) || qty <= 0) {
        rowErrors.push('Quantity must be a valid number greater than 0');
      } else {
        validatedData.packQuantity = qty;
      }
    }

    if (showUnitSize && row.unitSize) {
      const unitSizeVal = parseFloat(row.unitSize);
      if (isNaN(unitSizeVal) || unitSizeVal <= 0) {
        rowErrors.push(`${unitLabel} must be a valid number greater than 0`);
      } else {
        validatedData.unitSize = unitSizeVal;
      }
    }

    if (row.totalPrice) {
      const price = parseFloat(row.totalPrice);
      if (isNaN(price) || price <= 0) {
        rowErrors.push('Total Price must be a valid number greater than 0');
      } else {
        validatedData.totalPrice = price;
      }
    }

    const unitSizeVal = showUnitSize ? (validatedData.unitSize || 0) : 1;
    const totalQty = (validatedData.packQuantity || 0) * unitSizeVal;
    const costPerUnit = totalQty > 0 ? (validatedData.totalPrice || 0) / totalQty : 0;

    validatedData.totalQuantity = totalQty;
    validatedData.costPerUnit = costPerUnit;
    validatedData.unit = unit;
    validatedData.category = category;

    validatedData.isValid = rowErrors.length === 0;
    validatedData.errors = rowErrors;

    return validatedData;
  };

  const parseExcelFile = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (jsonData.length === 0) {
          toast.error('The Excel file is empty. Please add data and try again.');
          return;
        }

        const mappedData = jsonData.map(row => {
          const mappedRow = {};
          templateColumns.forEach(col => {
            const value = row[col.label];
            mappedRow[col.key] = value?.toString().trim() || '';
          });
          return mappedRow;
        });

        const validatedData = mappedData.map((row, index) => validateRow(row, index));
        setParsedData(validatedData);
        setUploadErrors([]);

        const dataErrors = validatedData.filter(r => r.errors.length > 0).length;
        if (dataErrors > 0) {
          toast.error(`${dataErrors} row(s) have validation errors. Please fix them before uploading.`);
        } else {
          toast.success(`${validatedData.length} item(s) parsed successfully.`);
        }
      } catch (error) {
        toast.error('Failed to read the Excel file. Please make sure it is valid.');
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read the file. Please try again.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      parseExcelFile(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseExcelFile(e.dataTransfer.files[0]);
    }
  };

  const removeRow = (index) => {
    setParsedData(prev => prev.filter((_, i) => i !== index));
  };

  const clearData = () => {
    setParsedData([]);
    setUploadErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    const invalidRows = parsedData.filter(r => !r.isValid);
    if (invalidRows.length > 0) {
      toast.error('Please fix validation errors before uploading.');
      return;
    }

    if (parsedData.length === 0) {
      toast.error('No data to upload. Please upload an Excel file first.');
      return;
    }

    setUploading(true);
    setUploadErrors([]);
    let successCount = 0;
    const failedItems = [];

    for (const item of parsedData) {
      try {
        const dataToSubmit = {
          productName: item.productName,
          category,
          unit,
          purchaseDate: item.purchaseDate,
          packQuantity: item.packQuantity,
          unitSize: showUnitSize ? item.unitSize : 1,
          totalQuantity: item.totalQuantity,
          totalPrice: item.totalPrice,
          costPerUnit: item.costPerUnit,
          openingStockQty: item.totalQuantity,
          openingRatePerUnit: item.costPerUnit,
          notes: item.notes || null
        };

        const response = await stockAPI.create(dataToSubmit);
        if (response.success) {
          successCount++;
        } else {
          failedItems.push({ name: item.productName, error: response.error || 'Unknown error' });
        }
      } catch (error) {
        failedItems.push({ name: item.productName, error: error.message || 'Server error' });
      }
    }

    setUploading(false);

    if (failedItems.length === 0) {
      toast.success(`Successfully added ${successCount} item(s)!`);
      navigate(`/dashboard/stock/${category.toLowerCase().replace(/\s+/g, '-')}`);
    } else {
      const errorMessages = failedItems.map(f => `${f.name}: ${f.error}`);
      setUploadErrors([
        `${successCount} item(s) added successfully.`,
        `${failedItems.length} item(s) failed to upload:`,
        ...errorMessages
      ]);
      toast.error(`${failedItems.length} item(s) failed to upload. See details below.`);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bulk Upload ${title}`}
        subtitle={`Import multiple ${title.toLowerCase()} items from an Excel file`}
        breadcrumbs={[
          { label: 'Stock', path: '/dashboard/stock' },
          { label: title, path: `/dashboard/stock/${category.toLowerCase().replace(/\s+/g, '-')}` },
          { label: 'Bulk Upload' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate(`/dashboard/stock/${category.toLowerCase().replace(/\s+/g, '-')}`)}
          >
            Back to List
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">How to bulk upload</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Download the Excel template with all required columns</li>
              <li>Fill in the data (one item per row)</li>
              <li>Upload the completed file below</li>
              <li>Review the data and fix any errors shown in red</li>
              <li>Click "Upload" to import</li>
            </ol>
          </div>
          <Button
            variant="outline"
            icon={HiOutlineDocumentDownload}
            onClick={downloadTemplate}
          >
            Download Template
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Excel File</h3>

        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <HiOutlineCloudUpload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag & drop your file here, or <span className="text-emerald-600 font-medium">browse</span>
          </p>
        </div>
      </Card>

      {parsedData.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Upload Preview</h3>
              <p className="text-sm text-gray-500">Review the data before uploading</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" icon={HiOutlineTrash} onClick={clearData}>Clear All</Button>
              <Button icon={HiOutlineCloudUpload} onClick={handleUpload} loading={uploading}>Upload</Button>
            </div>
          </div>

          {uploadErrors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {uploadErrors.map((err, idx) => (
                <p key={idx} className="text-sm">{err}</p>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableHeader>Status</TableHeader>
                <TableHeader>Row</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Quantity</TableHeader>
                {showUnitSize && <TableHeader>{unitLabel}</TableHeader>}
                <TableHeader>Total Qty</TableHeader>
                <TableHeader>Total Price</TableHeader>
                <TableHeader>Cost/Unit</TableHeader>
                <TableHeader>Notes</TableHeader>
                <TableHeader>Issues</TableHeader>
                <TableHeader></TableHeader>
              </TableHead>
              <TableBody>
                {parsedData.length === 0 ? (
                  <TableEmpty message="No data parsed" colSpan={showUnitSize ? 12 : 11} />
                ) : (
                  parsedData.map((row, index) => (
                    <TableRow key={index} className={!row.isValid ? 'bg-orange-50' : ''}>
                      <TableCell>
                        {row.isValid ? (
                          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center" title="Ready to upload">
                            <HiOutlineCheck className="w-4 h-4 text-emerald-600" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center" title="Has errors">
                            <HiOutlineExclamation className="w-4 h-4 text-red-600" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{row.rowIndex}</TableCell>
                      <TableCell>{row.purchaseDate}</TableCell>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell>{row.packQuantity}</TableCell>
                      {showUnitSize && <TableCell>{row.unitSize}</TableCell>}
                      <TableCell>{row.totalQuantity}</TableCell>
                      <TableCell>{row.totalPrice}</TableCell>
                      <TableCell>{row.costPerUnit.toFixed(2)}</TableCell>
                      <TableCell>{row.notes || '-'}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <ul className="text-xs text-red-600 space-y-1">
                            {row.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-emerald-600">No issues</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => removeRow(index)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Remove row"
                        >
                          <HiOutlineX className="w-4 h-4 text-gray-500" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default StockCategoryBulkUpload;
