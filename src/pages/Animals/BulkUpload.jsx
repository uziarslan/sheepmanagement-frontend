import React, { useState, useRef, useEffect } from 'react';
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
import { animalAPI, penAPI } from '../../services/mockApi';
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';
import {
  animalTypes,
  breedTypes,
  animalSubcategories,
  sexOptions,
  countries
} from '../../data/mockData';

const BulkUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchPens();
  }, []);

  const fetchPens = async () => {
    try {
      const response = await penAPI.getAll();
      if (response.success) {
        setPens(response.data);
      }
    } catch (error) {
      console.error('Error fetching pens:', error);
    } finally {
      setLoading(false);
    }
  };

  // Template columns definition
  const templateColumns = [
    { key: 'tagId', label: 'Tag ID', required: true, example: 'SHP-001' },
    { key: 'electronicId', label: 'Electronic ID (RFID)', required: false, example: 'RFID-0001' },
    { key: 'name', label: 'Animal Name', required: true, example: 'Sheru' },
    { key: 'animalType', label: 'Animal Type', required: true, example: 'Sheep', options: animalTypes },
    { key: 'breedType', label: 'Breed Type', required: true, example: 'Dumba', options: breedTypes },
    { key: 'subcategory', label: 'Subcategory', required: false, example: 'Fattening', options: animalSubcategories },
    { key: 'sex', label: 'Sex', required: true, example: 'Male', options: sexOptions },
    { key: 'purchasedFrom', label: 'Purchased From', required: false, example: 'Pakistan', options: countries },
    { key: 'arrivalDate', label: 'Arrival Date', required: true, example: '2025-01-15' },
    { key: 'birthDate', label: 'Birth Date', required: false, example: '2024-06-15' },
    { key: 'purchasePrice', label: 'Purchase Price', required: true, example: '45000' },
    { key: 'weight', label: 'Weight (kg)', required: true, example: '35' },
    { key: 'weightDate', label: 'Weight Date', required: false, example: '2025-01-15' },
    { key: 'penName', label: 'Pen Name', required: true, example: 'Pen A - Fattening 1' },
    { key: 'notes', label: 'Notes', required: false, example: 'Healthy animal' }
  ];

  // Download template Excel file
  const downloadTemplate = () => {
    const worksheetData = [
      templateColumns.map(col => col.label),
      templateColumns.map(col => col.example)
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet['!cols'] = templateColumns.map(() => ({ wch: 20 }));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Animals');
    
    // Add instructions sheet
    const instructionsData = [
      ['Animal Bulk Upload Instructions'],
      [''],
      ['Required Fields:'],
      ...templateColumns.filter(c => c.required).map(c => [`- ${c.label}`]),
      [''],
      ['Valid Options:'],
      [`Animal Type: ${animalTypes.join(', ')}`],
      [`Breed Type: ${breedTypes.join(', ')}`],
      [`Subcategory: ${animalSubcategories.join(', ')}`],
      [`Sex: ${sexOptions.join(', ')}`],
      [`Purchased From: ${countries.join(', ')}`],
      [`Pen Name: ${pens.map(p => p.name).join(', ')}`],
      [''],
      ['Date Format: YYYY-MM-DD (e.g., 2025-01-15)'],
      ['Price & Weight: Numbers only (no currency symbols)']
    ];
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    XLSX.writeFile(workbook, 'animal_bulk_upload_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  // Validate a single row
  const validateRow = (row, index) => {
    const rowErrors = [];
    const validatedData = { ...row, rowIndex: index + 2 }; // +2 for header row and 0-based index

    // Check required fields
    templateColumns.forEach(col => {
      if (col.required && !row[col.key]?.toString().trim()) {
        rowErrors.push(`${col.label} is required`);
      }
    });

    // Validate animal type
    if (row.animalType && !animalTypes.includes(row.animalType)) {
      rowErrors.push(`Invalid Animal Type: ${row.animalType}`);
    }

    // Validate breed type
    if (row.breedType && !breedTypes.includes(row.breedType)) {
      rowErrors.push(`Invalid Breed Type: ${row.breedType}`);
    }

    // Validate sex
    if (row.sex && !sexOptions.includes(row.sex)) {
      rowErrors.push(`Invalid Sex: ${row.sex}`);
    }

    // Validate subcategory
    if (row.subcategory && !animalSubcategories.includes(row.subcategory)) {
      rowErrors.push(`Invalid Subcategory: ${row.subcategory}`);
    }

    // Validate pen name and get penId
    if (row.penName) {
      const pen = pens.find(p => p.name.toLowerCase() === row.penName.toLowerCase());
      if (pen) {
        validatedData.penId = pen.id;
      } else {
        rowErrors.push(`Invalid Pen Name: ${row.penName}`);
      }
    }

    // Validate numbers
    if (row.purchasePrice && (isNaN(row.purchasePrice) || parseFloat(row.purchasePrice) <= 0)) {
      rowErrors.push('Invalid Purchase Price');
    } else {
      validatedData.purchasePrice = parseFloat(row.purchasePrice);
    }

    if (row.weight && (isNaN(row.weight) || parseFloat(row.weight) <= 0)) {
      rowErrors.push('Invalid Weight');
    } else {
      validatedData.weight = parseFloat(row.weight);
    }

    // Validate dates
    const dateFields = ['arrivalDate', 'birthDate', 'weightDate'];
    dateFields.forEach(field => {
      if (row[field]) {
        const date = new Date(row[field]);
        if (isNaN(date.getTime())) {
          rowErrors.push(`Invalid ${field.replace(/([A-Z])/g, ' $1').trim()}`);
        } else {
          validatedData[field] = row[field];
        }
      }
    });

    validatedData.status = 'Active';
    validatedData.pedigreeInfo = false;
    validatedData.isValid = rowErrors.length === 0;
    validatedData.errors = rowErrors;

    return validatedData;
  };

  // Parse Excel file
  const parseExcelFile = (file) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        if (jsonData.length === 0) {
          toast.error('No data found in the Excel file');
          return;
        }

        // Map headers to keys
        const mappedData = jsonData.map(row => {
          const mappedRow = {};
          templateColumns.forEach(col => {
            const value = row[col.label];
            mappedRow[col.key] = value?.toString().trim() || '';
          });
          return mappedRow;
        });

        // Validate each row
        const validatedData = mappedData.map((row, index) => validateRow(row, index));
        
        setParsedData(validatedData);
        
        const validCount = validatedData.filter(r => r.isValid).length;
        const invalidCount = validatedData.length - validCount;
        
        if (invalidCount > 0) {
          toast.error(`${invalidCount} of ${validatedData.length} rows have errors`);
        } else {
          toast.success(`${validCount} animals ready to import`);
        }
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('Failed to parse Excel file. Please check the format.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      parseExcelFile(file);
    }
  };

  // Handle drag and drop
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
    
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      parseExcelFile(file);
    }
  };

  // Remove row from parsed data
  const removeRow = (index) => {
    setParsedData(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all data
  const clearData = () => {
    setParsedData([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload all valid animals
  const handleUpload = async () => {
    const validAnimals = parsedData.filter(a => a.isValid);
    
    if (validAnimals.length === 0) {
      toast.error('No valid animals to upload');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const animal of validAnimals) {
      try {
        const { rowIndex, isValid, errors, penName, ...animalData } = animal;
        await animalAPI.create(animalData);
        successCount++;
      } catch (error) {
        failCount++;
        console.error('Error creating animal:', error);
      }
    }

    setUploading(false);

    if (failCount === 0) {
      toast.success(`Successfully added ${successCount} animals!`);
      navigate('/dashboard/animals');
    } else {
      toast.error(`Added ${successCount} animals, ${failCount} failed`);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Upload Animals"
        subtitle="Import multiple animals from an Excel file"
        breadcrumbs={[
          { label: 'Animals', path: '/dashboard/animals' },
          { label: 'Bulk Upload' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/animals')}
          >
            Back to List
          </Button>
        }
      />

      {/* Instructions Card */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">How to bulk upload animals</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Download the Excel template with all required columns</li>
              <li>Fill in the animal data (one animal per row)</li>
              <li>Upload the completed file below</li>
              <li>Review the data and fix any errors</li>
              <li>Click "Upload Animals" to import</li>
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

      {/* Upload Area */}
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
          
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
              <HiOutlineCloudUpload className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-gray-700 font-medium">
                Drag and drop your Excel file here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports .xlsx and .xls files
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Parsed Data Preview */}
      {parsedData.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Preview Data</h3>
              <p className="text-sm text-gray-500 mt-1">
                {validCount} valid, {invalidCount} with errors
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                icon={HiOutlineTrash}
                onClick={clearData}
              >
                Clear
              </Button>
              <Button
                icon={HiOutlineCloudUpload}
                onClick={handleUpload}
                loading={uploading}
                disabled={validCount === 0}
              >
                Upload {validCount} Animals
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Total Rows</p>
              <p className="text-2xl font-bold text-gray-800">{parsedData.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-sm text-emerald-600">Valid</p>
              <p className="text-2xl font-bold text-emerald-700">{validCount}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm text-red-600">Errors</p>
              <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableHeader className="w-12">Status</TableHeader>
                <TableHeader>Row</TableHeader>
                <TableHeader>Tag ID</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Breed</TableHeader>
                <TableHeader>Sex</TableHeader>
                <TableHeader>Price</TableHeader>
                <TableHeader>Weight</TableHeader>
                <TableHeader>Pen</TableHeader>
                <TableHeader>Errors</TableHeader>
                <TableHeader className="w-12">Action</TableHeader>
              </TableHead>
              <TableBody>
                {parsedData.map((animal, index) => (
                  <TableRow key={index} className={!animal.isValid ? 'bg-red-50' : ''}>
                    <TableCell>
                      {animal.isValid ? (
                        <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                          <HiOutlineCheck className="w-4 h-4 text-emerald-600" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                          <HiOutlineExclamation className="w-4 h-4 text-red-600" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">{animal.rowIndex}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{animal.tagId || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{animal.name || '-'}</span>
                    </TableCell>
                    <TableCell>{animal.animalType || '-'}</TableCell>
                    <TableCell>{animal.breedType || '-'}</TableCell>
                    <TableCell>
                      {animal.sex && (
                        <Badge variant={animal.sex === 'Male' ? 'info' : 'purple'}>
                          {animal.sex}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {animal.purchasePrice ? `Rs. ${animal.purchasePrice.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      {animal.weight ? `${animal.weight} kg` : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{animal.penName || '-'}</span>
                    </TableCell>
                    <TableCell>
                      {animal.errors?.length > 0 && (
                        <ul className="text-xs text-red-600 space-y-0.5">
                          {animal.errors.map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => removeRow(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BulkUpload;
