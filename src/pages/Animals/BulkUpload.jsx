import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import {
  HiOutlineArrowLeft,
  HiOutlineCloudUpload,
  HiOutlineDocumentDownload,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineExclamation,
  HiOutlineX,
  HiOutlineExclamationCircle
} from 'react-icons/hi';
import { animalAPI, penAPI } from '../../services/api';
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
  TableCell
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
  const [existingAnimals, setExistingAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [showTotalAmountModal, setShowTotalAmountModal] = useState(false);
  const [totalAmount, setTotalAmount] = useState('');
  const [purchaseTransport, setPurchaseTransport] = useState('');
  const [purchaseMandiExpenses, setPurchaseMandiExpenses] = useState('');
  const [purchaseFuel, setPurchaseFuel] = useState('');
  const [purchaseFood, setPurchaseFood] = useState('');
  const [purchaseHotel, setPurchaseHotel] = useState('');
  const [animalsToUpload, setAnimalsToUpload] = useState([]);
  const [visibleRows, setVisibleRows] = useState(50);
  const ROWS_PER_PAGE = 50;

  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch pens and animals separately to handle errors individually
      let pensData = [];
      let animalsData = [];

      try {
        const pensRes = await penAPI.getAll({ limit: 100 });
        if (pensRes.success && pensRes.data) {
          pensData = Array.isArray(pensRes.data) ? pensRes.data : [];
        } else if (Array.isArray(pensRes)) {
          // In case API returns array directly
          pensData = pensRes;
        } else if (pensRes && pensRes.data && Array.isArray(pensRes.data)) {
          pensData = pensRes.data;
        }
      } catch (penError) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('Error fetching pens:', penError);
        }
        toast.error('Failed to load pens. Please refresh the page.');
      }

      try {
        // Backend caps limit at 100; we just need a small sample for quick checks.
        const animalsRes = await animalAPI.getAll({ limit: 100, sort: 'tagId' });
        if (animalsRes.success && animalsRes.data) {
          animalsData = animalsRes.data;
        } else if (Array.isArray(animalsRes)) {
          animalsData = animalsRes;
        } else if (animalsRes.data && Array.isArray(animalsRes.data)) {
          animalsData = animalsRes.data;
        }
      } catch (animalError) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('Error fetching animals:', animalError);
        }
      }

      setPens(pensData);
      setExistingAnimals(animalsData);

      if (pensData.length === 0) {
        toast.error('No pens found. Please create pens first before bulk uploading animals.');
      }
    } catch (error) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('Error fetching data:', error);
      }
      toast.error('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Template columns definition - Pen is removed, will be selected in preview
  const templateColumns = [
    { key: 'tagId', label: 'Tag ID', required: true, example: 'SHP-001' },
    { key: 'name', label: 'Animal Name', required: true, example: 'Sheru' },
    { key: 'animalType', label: 'Animal Type', required: true, example: 'Sheep', options: animalTypes },
    { key: 'breedType', label: 'Breed Type', required: true, example: 'Dumba', options: breedTypes },
    { key: 'subcategory', label: 'Subcategory', required: true, example: 'Fattening', options: animalSubcategories },
    { key: 'sex', label: 'Sex', required: true, example: 'Male', options: sexOptions },
    { key: 'purchasedFrom', label: 'Purchased From', required: false, example: 'Pakistan', options: countries },
    { key: 'arrivalDate', label: 'Arrival Date', required: true, example: '2025-01-15' },
    { key: 'birthDate', label: 'Birth Date', required: false, example: '2024-06-15' },
    { key: 'buyingWeight', label: 'Buying Weight (kg)', required: false, example: '35' },
    { key: 'weight', label: 'Current Weight (kg)', required: true, example: '35' },
    { key: 'weightDate', label: 'Weight Date', required: false, example: '2025-01-15' },
    { key: 'notes', label: 'Notes', required: false, example: 'Healthy animal' }
  ];

  // Download template Excel file
  const downloadTemplate = async () => {
    const worksheetData = [
      templateColumns.map(col => col.label),
      templateColumns.map(col => col.example)
    ];

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet('Animals');
    worksheet.columns = templateColumns.map(() => ({ width: 20 }));
    worksheet.addRows(worksheetData);

    // Add instructions sheet
    const instructionsData = [
      ['Animal Bulk Upload Instructions'],
      [''],
      ['Required Fields:'],
      ...templateColumns.filter(c => c.required).map(c => [`- ${c.label}`]),
      [''],
      ['Note: Pen will be selected after uploading, in the preview table.'],
      ['Note: Purchase Price is NOT needed in the file. You will enter total amount after upload.'],
      [''],
      ['Valid Options:'],
      [`Animal Type: ${animalTypes.join(', ')}`],
      [`Breed Type: ${breedTypes.join(', ')}`],
      [`Subcategory: ${animalSubcategories.join(', ')}`],
      [`Sex: ${sexOptions.join(', ')}`],
      [`Purchased From: ${countries.join(', ')}`],
      [''],
      ['Date Format: YYYY-MM-DD (e.g., 2025-01-15)'],
      ['Price & Weight: Numbers only (no currency symbols)'],
      [''],
      ['Weight Fields:'],
      ['- Buying Weight: Initial weight at purchase'],
      ['- Current Weight: Present weight of the animal'],
      [''],
      ['Important:'],
      ['- Tag ID must be unique (not already in the system)'],
      ['- Each Tag ID can only appear once in the upload file']
    ];

    const instructionsSheet = workbook.addWorksheet('Instructions');
    instructionsSheet.getColumn(1).width = 60;
    instructionsSheet.addRows(instructionsData);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animal_bulk_upload_template.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  // Check if tag ID already exists in database
  const isTagIdExistsInDb = (tagId) => {
    if (!tagId) return false;
    return existingAnimals.some(a => 
      a.tagId?.toLowerCase().trim() === tagId.toLowerCase().trim()
    );
  };

  const normalizeTagId = (value) => String(value ?? '').trim().toUpperCase();

  // Get friendly error message
  // eslint-disable-next-line no-unused-vars
  const getFriendlyErrorMessage = (key, value) => {
    const fieldLabels = {
      tagId: 'Tag ID',
      name: 'Animal Name',
      animalType: 'Animal Type',
      breedType: 'Breed Type',
      sex: 'Sex',
      purchasePrice: 'Purchase Price',
      buyingWeight: 'Buying Weight',
      weight: 'Current Weight',
      arrivalDate: 'Arrival Date',
      birthDate: 'Birth Date',
      weightDate: 'Weight Date',
      penId: 'Pen'
    };
    return fieldLabels[key] || key;
  };

  // Validate a single row
  // Fast: uses precomputed duplicate counts and existing tag set
  const validateRow = (row, index, ctx) => {
    const rowErrors = [];
    const validatedData = { ...row, rowIndex: index + 2, penId: '' }; // +2 for header row and 0-based index

    // Check required fields
    templateColumns.forEach(col => {
      if (col.required && !row[col.key]?.toString().trim()) {
        rowErrors.push(`${col.label} is required`);
      }
    });

    // Check for duplicate Tag ID within the uploaded file
    const normalizedTagId = normalizeTagId(row.tagId);
    if (normalizedTagId) {
      validatedData.tagId = normalizedTagId;
      if ((ctx?.tagCounts?.get(normalizedTagId) || 0) > 1) {
        rowErrors.push(`Tag ID "${normalizedTagId}" appears multiple times in this file`);
      }
      // Best-effort local check (we don't fetch the full DB list)
      if (ctx?.existingTagSet?.has(normalizedTagId) || isTagIdExistsInDb(normalizedTagId)) {
        rowErrors.push(`Tag ID "${normalizedTagId}" already exists in the system`);
      }
    }

    // Validate animal type
    if (row.animalType && !animalTypes.includes(row.animalType)) {
      rowErrors.push(`"${row.animalType}" is not a valid Animal Type. Valid options: ${animalTypes.join(', ')}`);
    }

    // Validate breed type
    if (row.breedType && !breedTypes.includes(row.breedType)) {
      rowErrors.push(`"${row.breedType}" is not a valid Breed Type. Valid options: ${breedTypes.join(', ')}`);
    }

    // Validate sex
    if (row.sex && !sexOptions.includes(row.sex)) {
      rowErrors.push(`"${row.sex}" is not a valid Sex. Valid options: ${sexOptions.join(', ')}`);
    }

    // Validate subcategory
    if (row.subcategory && !animalSubcategories.includes(row.subcategory)) {
      rowErrors.push(`"${row.subcategory}" is not a valid Subcategory. Valid options: ${animalSubcategories.join(', ')}`);
    }

    // Validate purchased from
    if (row.purchasedFrom && !countries.includes(row.purchasedFrom)) {
      rowErrors.push(`"${row.purchasedFrom}" is not a valid country. Valid options: ${countries.slice(0, 5).join(', ')}...`);
    }

    // Purchase price is NOT from Excel - collected via modal after upload

    if (row.buyingWeight) {
      const buyingWeight = parseFloat(row.buyingWeight);
      if (isNaN(buyingWeight)) {
        rowErrors.push(`Buying Weight "${row.buyingWeight}" is not a valid number`);
      } else if (buyingWeight <= 0) {
        rowErrors.push('Buying Weight must be greater than 0');
      } else if (buyingWeight > 500) {
        rowErrors.push('Buying Weight seems too high (max 500 kg)');
      } else {
        validatedData.buyingWeight = buyingWeight;
      }
    }

    if (row.weight) {
      const weight = parseFloat(row.weight);
      if (isNaN(weight)) {
        rowErrors.push(`Current Weight "${row.weight}" is not a valid number`);
      } else if (weight <= 0) {
        rowErrors.push('Current Weight must be greater than 0');
      } else if (weight > 500) {
        rowErrors.push('Current Weight seems too high (max 500 kg)');
      } else {
        validatedData.weight = weight;
      }
    }

    // Validate dates
    const dateFields = ['arrivalDate', 'birthDate', 'weightDate'];
    dateFields.forEach(field => {
      if (row[field]) {
        const dateStr = row[field].toString().trim();
        const date = new Date(dateStr);
        
        if (isNaN(date.getTime())) {
          const fieldLabel = field.replace(/([A-Z])/g, ' $1').trim();
          rowErrors.push(`"${dateStr}" is not a valid date format for ${fieldLabel}. Use YYYY-MM-DD format.`);
        } else {
          // Check if date is not in the future (except for arrivalDate which could be today)
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          
          if (field === 'birthDate' && date > today) {
            rowErrors.push('Birth Date cannot be in the future');
          }
          
          validatedData[field] = dateStr;
        }
      }
    });

    // Check if birth date is before arrival date
    if (validatedData.birthDate && validatedData.arrivalDate) {
      const birthDate = new Date(validatedData.birthDate);
      const arrivalDate = new Date(validatedData.arrivalDate);
      if (birthDate > arrivalDate) {
        rowErrors.push('Birth Date cannot be after Arrival Date');
      }
    }

    validatedData.status = 'Active';
    validatedData.pedigreeInfo = false;
    validatedData.isValid = rowErrors.length === 0;
    validatedData.errors = rowErrors;

    return validatedData;
  };

  // Re-validate all rows (used when pen is changed)
  const revalidateRows = (data) => {
    return data.map((row, index) => {
      const errors = [...row.errors.filter(e => !e.includes('Pen'))];
      
      // Check if pen is selected
      if (!row.penId) {
        errors.push('Please select a Pen for this animal');
      }

      return {
        ...row,
        errors,
        isValid: errors.length === 0
      };
    });
  };

  // Parse Excel file
  const parseExcelFile = (file) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(e.target.result);

        // Get first sheet
        const worksheet = workbook.worksheets[0];

        // Extract headers from row 1
        const headers = [];
        worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colIdx) => {
          headers[colIdx - 1] = cell.value != null ? String(cell.value).trim() : '';
        });

        // Normalize headers so slightly different names still map correctly
        const normalizeHeader = (h) =>
          String(h || '')
            .trim()
            .toLowerCase()
            .replace(/[\s\-_()]/g, '');

        const headerAliases = {
          tagId: ['tagid', 'tag', 'tagno', 'tagnumber', 'tag#', 'tagid#'],
          name: ['animalname', 'name'],
          animalType: ['animaltype', 'type'],
          breedType: ['breedtype', 'breed'],
          subcategory: ['subcategory', 'animalsubcategory', 'subcat', 'category'],
          sex: ['sex', 'gender'],
          purchasedFrom: ['purchasedfrom', 'country', 'origin'],
          arrivalDate: ['arrivaldate', 'arrival', 'dateofarrival', 'purchasedate'],
          birthDate: ['birthdate', 'dob', 'dateofbirth'],
          buyingWeight: ['buyingweight', 'initialweight', 'purchaseweight'],
          weight: ['currentweightkg', 'currentweight', 'weightkg', 'weight'],
          weightDate: ['weightdate', 'dateofweight', 'weighedon'],
          notes: ['notes', 'note', 'remarks', 'comment', 'comments']
        };

        const headerIndexByKey = {};
        const normalizedHeaders = headers.map(normalizeHeader);
        Object.entries(headerAliases).forEach(([key, aliases]) => {
          const idx = normalizedHeaders.findIndex((h) => aliases.includes(h));
          if (idx >= 0) headerIndexByKey[key] = idx;
        });

        // Convert to JSON (array of objects keyed by header, mirroring sheet_to_json behaviour)
        const jsonData = [];
        worksheet.eachRow((row, rowNum) => {
          if (rowNum === 1) return;
          const obj = {};
          headers.forEach((h, i) => {
            const cell = row.getCell(i + 1);
            obj[h] = cell.value != null ? String(cell.value).trim() : '';
          });
          jsonData.push(obj);
        });
        
        if (jsonData.length === 0) {
          toast.error('The Excel file is empty. Please add animal data and try again.');
          return;
        }

        // Map headers to keys (tolerant of header name variations)
        const mappedData = jsonData.map(row => {
          const mappedRow = {};
          templateColumns.forEach(col => {
            const idx = headerIndexByKey[col.key];
            if (idx != null) {
              const h = headers[idx];
              const value = row[h];
              mappedRow[col.key] = value?.toString().trim() || '';
            } else {
              // Fallback: exact label match
              const value = row[col.label];
              mappedRow[col.key] = value?.toString().trim() || '';
            }
          });
          return mappedRow;
        });

        // Validate each row (pass all rows for duplicate check)
        // Precompute duplicate counts in O(n)
        const tagCounts = new Map();
        for (const row of mappedData) {
          const t = normalizeTagId(row.tagId);
          if (!t) continue;
          tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }

        // Precompute existing tags (best-effort, limited list)
        const existingTagSet = new Set(
          (existingAnimals || []).map(a => normalizeTagId(a.tagId)).filter(Boolean)
        );

        const ctx = { tagCounts, existingTagSet };
        const validatedData = mappedData.map((row, index) => validateRow(row, index, ctx));
        
        // Mark all as needing pen selection (add pen error)
        const dataWithPenError = validatedData.map(row => ({
          ...row,
          errors: [...row.errors, 'Please select a Pen for this animal'],
          isValid: false
        }));
        
        setParsedData(dataWithPenError);
        setVisibleRows(ROWS_PER_PAGE);
        setUploadErrors([]);
        
        const dataErrors = validatedData.filter(r => r.errors.length > 0).length;
        
        if (dataErrors > 0) {
          toast.error(`${dataErrors} row(s) have validation errors. Please fix them before uploading.`);
        } else {
          toast.success(`${validatedData.length} animal(s) parsed successfully. Please select a pen for each animal.`);
        }
      } catch (error) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('Error parsing Excel:', error);
        }
        toast.error('Failed to read the Excel file. Please make sure it\'s a valid .xlsx or .xls file.');
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read the file. Please try again.');
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File is too large. Maximum size is 5MB.');
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
        toast.error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      parseExcelFile(file);
    }
  };

  // Handle pen selection for a row
  const handlePenChange = (index, penId) => {
    setParsedData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], penId };
      return revalidateRows(updated);
    });
  };

  // Set same pen for all rows
  const setAllPens = (penId) => {
    if (!penId) return;
    setParsedData(prev => {
      const updated = prev.map(row => ({ ...row, penId }));
      return revalidateRows(updated);
    });
    toast.success(`Pen set for all ${parsedData.length} animals`);
  };

  // Remove row from parsed data (O(n) duplicate recheck using a Map)
  const removeRow = (index) => {
    setParsedData(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const tagCounts = new Map();
      for (const r of updated) {
        const t = normalizeTagId(r.tagId);
        if (t) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
      return updated.map(row => {
        const baseRow = { ...row };
        baseRow.errors = baseRow.errors.filter(e => !e.includes('appears multiple times'));
        const t = normalizeTagId(baseRow.tagId);
        if (t && (tagCounts.get(t) || 0) > 1) {
          baseRow.errors.push(`Tag ID "${t}" appears multiple times in this file`);
        }
        baseRow.isValid = baseRow.errors.length === 0;
        return baseRow;
      });
    });
  };

  // Clear all data
  const clearData = () => {
    setParsedData([]);
    setUploadErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Pre-upload validation
  const validateBeforeUpload = () => {
    const errors = [];

    // Check if any rows exist
    if (parsedData.length === 0) {
      errors.push('No data to upload. Please upload an Excel file first.');
      return errors;
    }

    // Check for rows without pen selected
    const noPenRows = parsedData.filter(r => !r.penId);
    if (noPenRows.length > 0) {
      errors.push(`${noPenRows.length} animal(s) don't have a pen selected. Please select a pen for each animal.`);
    }

    // Check for invalid rows
    const invalidRows = parsedData.filter(r => !r.isValid);
    if (invalidRows.length > 0) {
      errors.push(`${invalidRows.length} animal(s) have validation errors. Please fix them or remove the rows.`);
    }

    // Check for duplicate tag IDs one more time (O(n) with Set)
    const seen = new Set();
    const duplicates = new Set();
    for (const r of parsedData) {
      const t = (r.tagId || '').toLowerCase().trim();
      if (!t) continue;
      if (seen.has(t)) duplicates.add(t);
      seen.add(t);
    }
    if (duplicates.size > 0) {
      errors.push(`Duplicate Tag IDs found: ${[...duplicates].join(', ')}`);
    }

    // Check pen capacity constraints
    const validAnimals = parsedData.filter(r => r.isValid && r.penId);
    const penCounts = {};
    validAnimals.forEach(animal => {
      penCounts[animal.penId] = (penCounts[animal.penId] || 0) + 1;
    });

    for (const [penId, count] of Object.entries(penCounts)) {
      const pen = pens.find(p => getId(p) === penId);
      if (pen) {
        // Get current animal count in this pen
        const currentAnimalsInPen = existingAnimals.filter(a => getId(a.pen || a.penId) === penId && a.status === 'Active').length;
        const totalCapacity = pen.capacity || 0;
        const projectedCount = currentAnimalsInPen + count;
        if (projectedCount > totalCapacity) {
          const penName = pen.name || penId;
          errors.push(`Pen "${penName}" would exceed capacity. Current: ${currentAnimalsInPen}, Adding: ${count}, Capacity: ${totalCapacity}`);
        }
      }
    }

    return errors;
  };

  // Upload all valid animals
  const handleUpload = async () => {
    const preUploadErrors = validateBeforeUpload();
    if (preUploadErrors.length > 0) {
      setUploadErrors(preUploadErrors);
      preUploadErrors.forEach(err => toast.error(err));
      return;
    }

    const validAnimals = parsedData.filter(a => a.isValid);
    
    if (validAnimals.length === 0) {
      toast.error('No valid animals to upload. Please fix all errors first.');
      return;
    }

    // Show modal to collect total amount and purchasing expenses
    setAnimalsToUpload(validAnimals);
    setTotalAmount('');
    setPurchaseTransport('');
    setPurchaseMandiExpenses('');
    setPurchaseFuel('');
    setPurchaseFood('');
    setPurchaseHotel('');
    setShowTotalAmountModal(true);
  };

  // Allocate purchase price per animal by weight: per kg cost = total / total weight, each animal = per kg × buying weight
  const calculatePricePerAnimal = (validAnimals, totalAmt) => {
    if (!validAnimals || validAnimals.length === 0) return [];

    const totalAmountNum = parseFloat(totalAmt);
    const totalBuyingWeight = validAnimals.reduce(
      (sum, a) => sum + (parseFloat(a.buyingWeight) || parseFloat(a.weight) || 0),
      0
    );

    if (totalBuyingWeight <= 0) {
      // Fallback: equal split if no weights
      const pricePerAnimal = totalAmountNum / validAnimals.length;
      return validAnimals.map(animal => ({
        ...animal,
        purchasePrice: parseFloat(pricePerAnimal.toFixed(2))
      }));
    }

    const perKgCost = totalAmountNum / totalBuyingWeight;
    const allocations = validAnimals.map(a => {
      const w = parseFloat(a.buyingWeight) || parseFloat(a.weight) || 0;
      return Math.round(perKgCost * w * 100) / 100;
    });
    // Fix rounding: ensure sum equals total
    const sumAlloc = allocations.reduce((s, v) => s + v, 0);
    const diff = Math.round((totalAmountNum - sumAlloc) * 100) / 100;
    if (diff !== 0 && allocations.length > 0) allocations[0] += diff;

    return validAnimals.map((animal, i) => ({
      ...animal,
      purchasePrice: allocations[i] ?? 0
    }));
  };

  // Sum of purchasing expenses for bulk
  const getPurchaseExpensesTotal = () => {
    return (
      (parseFloat(purchaseTransport) || 0) +
      (parseFloat(purchaseMandiExpenses) || 0) +
      (parseFloat(purchaseFuel) || 0) +
      (parseFloat(purchaseFood) || 0) +
      (parseFloat(purchaseHotel) || 0)
    );
  };

  // Handle submission of total amount (total cost = animal cost + expenses; allocate all by weight)
  const handleTotalAmountSubmit = async () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error('Please enter a valid total amount for the animals');
      return;
    }

    // Purchase price is allocated by weight from the animals-only total.
    // Purchasing expenses are a BATCH cost, split EQUALLY across animals below
    // (each animal carries only its share, not the full batch amount).
    const animalsWithPrice = calculatePricePerAnimal(animalsToUpload, String(parseFloat(totalAmount)));

    // Split each batch expense equally across animals. Rounding remainder (if the
    // amount doesn't divide evenly) is added to the first animal so the per-field
    // shares sum back to exactly what was entered.
    const animalCount = animalsWithPrice.length;
    const splitEqually = (value) => {
      const amt = parseFloat(value) || 0;
      if (animalCount === 0 || amt === 0) return new Array(animalCount).fill(0);
      const per = Math.round((amt / animalCount) * 100) / 100;
      const shares = new Array(animalCount).fill(per);
      const diff = Math.round((amt - per * animalCount) * 100) / 100;
      if (diff !== 0) shares[0] = Math.round((shares[0] + diff) * 100) / 100;
      return shares;
    };
    const expenseShares = {
      purchaseTransport: splitEqually(purchaseTransport),
      purchaseMandiExpenses: splitEqually(purchaseMandiExpenses),
      purchaseFuel: splitEqually(purchaseFuel),
      purchaseFood: splitEqually(purchaseFood),
      purchaseHotel: splitEqually(purchaseHotel)
    };

    setUploading(true);
    setUploadErrors([]);
    setShowTotalAmountModal(false);

    // Fields the backend create endpoint accepts (avoids "is not allowed" validation errors)
    const allowedCreateFields = [
      'tagId', 'electronicId', 'name', 'animalType', 'breedType', 'subcategory',
      'sex', 'purchasedFrom', 'arrivalDate', 'birthDate', 'purchasePrice',
      'purchaseTransport', 'purchaseMandiExpenses', 'purchaseFuel', 'purchaseFood', 'purchaseHotel',
      'buyingWeight', 'weight', 'weightDate', 'pen', 'status', 'pedigreeInfo',
      'sire', 'dam', 'notes'
    ];

    // Prepare all animals with proper payload structure
    const animalsPayload = animalsWithPrice.map((animal, i) => {
      const { rowIndex, isValid, errors: rowErrors, penId, ...rest } = animal;
      // Only send allowed fields to avoid backend validation errors
      const payload = {};
      allowedCreateFields.forEach((key) => {
        if (key === 'pen') {
          const pen = penId || rest.pen;
          if (pen !== undefined) payload[key] = pen;
        } else if (key.startsWith('purchase') && key !== 'purchasePrice' && key !== 'purchasedFrom') {
          // Each animal carries its equal share of the batch expense, not the full amount.
          payload[key] = expenseShares[key] ? (expenseShares[key][i] || 0) : 0;
        } else if (rest[key] !== undefined) {
          payload[key] = rest[key];
        }
      });
      // Ensure dates are Date objects for Joi
      if (payload.arrivalDate) payload.arrivalDate = new Date(payload.arrivalDate);
      if (payload.birthDate) payload.birthDate = payload.birthDate ? new Date(payload.birthDate) : null;
      if (payload.weightDate) payload.weightDate = payload.weightDate ? new Date(payload.weightDate) : undefined;

      return payload;
    });

    try {
      const response = await animalAPI.bulkCreate(animalsPayload);
      if (response.success) {
        toast.success(`Successfully added ${animalsPayload.length} animal(s)!`);
        navigate('/dashboard/animals');
      } else {
        const errorMsg = response.error || response.message || 'Failed to upload animals';
        setUploadErrors([errorMsg]);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Server error';
      setUploadErrors([errorMsg]);
      toast.error(`Failed to upload animals: ${errorMsg}`);
      if (process.env.NODE_ENV !== 'production') {
        if (typeof console !== 'undefined' && console.error) {
          console.error('Error bulk creating animals:', error);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.length - validCount;
  const noPenCount = parsedData.filter(r => !r.penId).length;

  // Pen options for dropdown
  // eslint-disable-next-line no-unused-vars
  const penOptions = [
    { value: '', label: 'Select Pen...' },
    ...pens.map(p => ({ 
      value: getId(p), 
      label: `${p.name} (${p.animalCount || 0}/${p.capacity || '?'})` 
    }))
  ];

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
              <li>Fill in the animal data (one animal per row) - <span className="text-emerald-600 font-medium">Pen will be selected here</span></li>
              <li>Upload the completed file below</li>
              <li>Select a pen for each animal from the dropdown</li>
              <li>Review the data and fix any errors shown in red</li>
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

      {/* Pens Status */}
      {pens.length === 0 ? (
        <Card className="border-orange-200 bg-orange-50">
          <div className="flex items-center gap-3">
            <HiOutlineExclamationCircle className="w-6 h-6 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">No pens available</p>
              <p className="text-sm text-orange-600">
                Please create pens first before bulk uploading animals.{' '}
                <button 
                  onClick={() => navigate('/dashboard/pens/add')}
                  className="underline hover:no-underline"
                >
                  Create a pen
                </button>
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-3">
            <HiOutlineCheck className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-800">{pens.length} pen(s) available</p>
              <p className="text-sm text-emerald-600">
                You can assign animals to: {pens.slice(0, 5).map(p => p.name).join(', ')}{pens.length > 5 ? ` and ${pens.length - 5} more` : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

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
            disabled={pens.length === 0}
          />
          
          <div className="space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              pens.length === 0 ? 'bg-gray-100' : 'bg-emerald-100'
            }`}>
              <HiOutlineCloudUpload className={`w-8 h-8 ${pens.length === 0 ? 'text-gray-400' : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className={`font-medium ${pens.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                {pens.length === 0 
                  ? 'Please create pens first' 
                  : 'Drag and drop your Excel file here, or click to browse'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports .xlsx and .xls files (max 5MB)
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <HiOutlineExclamationCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800 mb-2">Upload Issues</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {uploadErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Parsed Data Preview */}
      {parsedData.length > 0 && (
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Preview & Assign Pens</h3>
              <p className="text-sm text-gray-500 mt-1">
                {validCount} ready, {invalidCount} need attention
                {noPenCount > 0 && ` (${noPenCount} without pen)`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                icon={HiOutlineTrash}
                onClick={clearData}
              >
                Clear All
              </Button>
              <Button
                icon={HiOutlineCloudUpload}
                onClick={handleUpload}
                loading={uploading}
                disabled={validCount === 0 || uploading}
              >
                Upload {validCount} Animal{validCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500">Total Rows</p>
              <p className="text-2xl font-bold text-gray-800">{parsedData.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-sm text-emerald-600">Ready to Upload</p>
              <p className="text-2xl font-bold text-emerald-700">{validCount}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-sm text-orange-600">Need Pen</p>
              <p className="text-2xl font-bold text-orange-700">{noPenCount}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm text-red-600">Has Errors</p>
              <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
            </div>
          </div>

          {/* Bulk Pen Assignment */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 mb-1">Quick Action: Set same pen for all animals</p>
                <p className="text-xs text-blue-600">This will override individual pen selections</p>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  onChange={(e) => setAllPens(e.target.value)}
                  defaultValue=""
                >
                  <option value="">Select pen for all...</option>
                  {pens.map(p => (
                    <option key={getId(p)} value={getId(p)}>
                      {p.name} ({p.animalCount || 0}/{p.capacity || '?'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Table (paginated for performance) */}
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
                <TableHeader>Weight</TableHeader>
                <TableHeader className="min-w-[200px]">Pen *</TableHeader>
                <TableHeader>Issues</TableHeader>
                <TableHeader className="w-12"></TableHeader>
              </TableHead>
              <TableBody>
                {parsedData.slice(0, visibleRows).map((animal, index) => (
                  <TableRow 
                    key={index} 
                    className={
                      !animal.isValid 
                        ? animal.errors.some(e => e.includes('already exists') || e.includes('multiple times'))
                          ? 'bg-red-100' 
                          : 'bg-orange-50' 
                        : ''
                    }
                  >
                    <TableCell>
                      {animal.isValid ? (
                        <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center" title="Ready to upload">
                          <HiOutlineCheck className="w-4 h-4 text-emerald-600" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center" title="Has errors">
                          <HiOutlineExclamation className="w-4 h-4 text-red-600" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">{animal.rowIndex}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-sm ${
                        animal.errors.some(e => e.includes('Tag ID')) ? 'text-red-600 font-semibold' : ''
                      }`}>
                        {animal.tagId || <span className="text-red-400 italic">Missing</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{animal.name || <span className="text-red-400 italic">Missing</span>}</span>
                    </TableCell>
                    <TableCell>{animal.animalType || '-'}</TableCell>
                    <TableCell>{animal.breedType || '-'}</TableCell>
                    <TableCell>
                      {animal.sex ? (
                        <Badge variant={animal.sex === 'Male' ? 'info' : 'purple'}>
                          {animal.sex}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {animal.weight ? `${animal.weight} kg` : '-'}
                    </TableCell>
                    <TableCell>
                      <select
                        value={animal.penId || ''}
                        onChange={(e) => handlePenChange(index, e.target.value)}
                        className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                          !animal.penId ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Pen...</option>
                        {pens.map(p => (
                          <option key={getId(p)} value={getId(p)}>
                            {p.name} ({p.animalCount || 0}/{p.capacity || '?'})
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      {animal.errors?.length > 0 && (
                        <ul className="text-xs text-red-600 space-y-0.5 max-w-xs">
                          {animal.errors.slice(0, 3).map((err, i) => (
                            <li key={i} className="truncate" title={err}>• {err}</li>
                          ))}
                          {animal.errors.length > 3 && (
                            <li className="text-gray-500">+{animal.errors.length - 3} more</li>
                          )}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => removeRow(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove this row"
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Show more / Show all */}
          {parsedData.length > visibleRows && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="text-sm text-gray-500">
                Showing {visibleRows} of {parsedData.length} rows
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleRows(v => Math.min(v + ROWS_PER_PAGE, parsedData.length))}
              >
                Show {Math.min(ROWS_PER_PAGE, parsedData.length - visibleRows)} more
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleRows(parsedData.length)}
              >
                Show all
              </Button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tips:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <span className="text-red-600">Red rows</span>: Tag ID conflicts (duplicate or already exists)</li>
              <li>• <span className="text-orange-600">Orange rows</span>: Missing required fields or validation errors</li>
              <li>• Select a pen for each animal before uploading</li>
              <li>• Use "Select pen for all" to quickly assign the same pen to all animals</li>
              <li>• Click the X button to remove a row you don't want to upload</li>
            </ul>
          </div>
        </Card>
      )}

      {/* Total Amount Modal */}
      {showTotalAmountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Total Amount & Purchasing Expenses for {animalsToUpload.length} Animal{animalsToUpload.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter the total (collective) amount you paid for all these animals, then any purchasing expenses. The animal amount is allocated by buying weight (same per kg cost for each animal). Expenses are a batch cost and are split equally across all animals.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount for Animals (Rs.)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-600">Rs.</span>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g., 100000"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700 mb-2">Purchasing Expenses (collective)</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Transport</label>
                  <input
                    type="number"
                    value={purchaseTransport}
                    onChange={(e) => setPurchaseTransport(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Mandi Expenses</label>
                  <input
                    type="number"
                    value={purchaseMandiExpenses}
                    onChange={(e) => setPurchaseMandiExpenses(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fuel</label>
                  <input
                    type="number"
                    value={purchaseFuel}
                    onChange={(e) => setPurchaseFuel(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Food</label>
                  <input
                    type="number"
                    value={purchaseFood}
                    onChange={(e) => setPurchaseFood(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hotel</label>
                  <input
                    type="number"
                    value={purchaseHotel}
                    onChange={(e) => setPurchaseHotel(e.target.value)}
                    placeholder="0"
                    min={0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {animalsToUpload.length > 0 && totalAmount && parseFloat(totalAmount) > 0 && (() => {
                const animalTotal = parseFloat(totalAmount);
                const expensesTotal = getPurchaseExpensesTotal();
                const totalWithExpenses = animalTotal + expensesTotal;
                const count = animalsToUpload.length;
                const totalW = animalsToUpload.reduce((s, a) => s + (parseFloat(a.buyingWeight) || parseFloat(a.weight) || 0), 0);
                const perKg = totalW > 0 ? animalTotal / totalW : 0;
                const sample = animalsToUpload[0];
                const sampleW = parseFloat(sample?.buyingWeight) || parseFloat(sample?.weight) || 0;
                const sampleAnimalPrice = totalW > 0 ? (perKg * sampleW) : (animalTotal / count);
                const expensePerAnimal = count > 0 ? expensesTotal / count : 0;
                return (
                  <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {expensesTotal > 0 && (
                      <p className="text-sm text-blue-800 font-medium mb-1">
                        Total cost (animals + expenses): Rs. {totalWithExpenses.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-blue-800 font-medium mb-2">Per-animal breakdown (auto-calculated):</p>
                    <p className="text-sm text-blue-700 font-semibold">
                      Animals: Rs. {perKg.toFixed(2)} per kg
                    </p>
                    {expensesTotal > 0 && (
                      <p className="text-sm text-blue-700 font-semibold">
                        Expenses: Rs. {expensePerAnimal.toFixed(2)} per animal (split equally)
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      Example: {sampleW} kg → animal Rs. {sampleAnimalPrice.toFixed(2)}
                      {expensesTotal > 0 ? ` + expenses Rs. ${expensePerAnimal.toFixed(2)} = Rs. ${(sampleAnimalPrice + expensePerAnimal).toFixed(2)}` : ''}
                    </p>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTotalAmountModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTotalAmountSubmit}
                  disabled={!totalAmount || parseFloat(totalAmount) <= 0 || uploading}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload Animals'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
