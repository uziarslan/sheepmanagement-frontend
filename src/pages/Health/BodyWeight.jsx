import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineScale,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineDocumentDownload,
  HiOutlineCloudUpload,
  HiOutlineExclamationCircle
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import * as XLSX from 'xlsx';
import { animalAPI, healthAPI, penAPI } from '../../services/mockApi';
import { formatDate, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  SearchInput,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty
} from '../../components/common';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const toISODate = (d) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Monday-based week start.
const getWeekStartISO = (dateLike) => {
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return '';
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return toISODate(copy);
};

const BodyWeight = () => {
  const [animals, setAnimals] = useState([]);
  const [weightRecords, setWeightRecords] = useState([]);
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [penFilter, setPenFilter] = useState('');
  const [sexFilter, setSexFilter] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [minWeight, setMinWeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [weeksToShow, setWeeksToShow] = useState(12);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  // Excel Import modal state
  const importInputRef = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]); // { tagId, animalId, animalName, penName, weekStart, date, weight, status, errors[] }
  const [importErrors, setImportErrors] = useState([]);
  const lastFetchErrorRef = useRef('');
  
  // Form state
  const [formData, setFormData] = useState({
    animalId: '',
    date: new Date().toISOString().split('T')[0],
    weight: ''
  });
  const [errors, setErrors] = useState({});

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;
  const getAnimalPenId = (animal) => {
    const pen = animal?.pen ?? animal?.penId;
    if (pen && typeof pen === 'object') return pen._id || pen.id;
    return pen;
  };
  const getAnimalPenName = (animal) => {
    if (animal?.pen && typeof animal.pen === 'object' && animal.pen.name) return animal.pen.name;
    const penId = getAnimalPenId(animal);
    const found = pens.find(p => String(p._id || p.id) === String(penId || ''));
    return found?.name || 'Unassigned';
  };

  const fetchData = useCallback(async () => {
    const fetchAllPages = async (fetchFn, { limit = 100, maxPages = 50 } = {}) => {
      const all = [];
      for (let page = 1; page <= maxPages; page++) {
        const res = await fetchFn({ page, limit });
        if (!res?.success) {
          throw new Error(res?.message || 'Request failed');
        }
        const chunk = Array.isArray(res.data) ? res.data : [];
        all.push(...chunk);
        if (chunk.length < limit) break;
      }
      return all;
    };

    try {
      // Only fetch weights for the selected week window to keep payload small.
      const weeksWindow = Number.isFinite(Number(weeksToShow)) && Number(weeksToShow) > 0
        ? Number(weeksToShow)
        : 12;

      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - (weeksWindow * 7) + 1);
      start.setHours(0, 0, 0, 0);

      const startISO = toISODate(start);
      const endISO = toISODate(end);

      // Backend validation caps `limit` at 100 for these endpoints.
      // Fetch page-by-page to avoid validation errors and still get all data needed.
      const [animalsAll, pensAll, weightsAll] = await Promise.all([
        fetchAllPages((p) => animalAPI.getAll({ ...p, status: 'Active', sort: 'tagId' }), { limit: 100, maxPages: 50 }),
        fetchAllPages((p) => penAPI.getAll({ ...p, sort: 'name' }), { limit: 100, maxPages: 20 }),
        fetchAllPages(
          (p) => healthAPI.getWeightRecords({
            ...p,
            ...(startISO ? { startDate: startISO } : {}),
            ...(endISO ? { endDate: endISO } : {}),
            sort: '-date'
          }),
          { limit: 100, maxPages: 100 }
        )
      ]);

      setAnimals((animalsAll || []).filter(a => a.status === 'Active'));
      setPens(pensAll || []);
      setWeightRecords(weightsAll || []);
    } catch (error) {
      const msg = error?.message || 'Failed to fetch data';
      // React StrictMode can run effects twice in dev; avoid duplicate identical toasts.
      if (lastFetchErrorRef.current !== msg) {
        toast.error(msg);
        lastFetchErrorRef.current = msg;
        setTimeout(() => {
          if (lastFetchErrorRef.current === msg) lastFetchErrorRef.current = '';
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  }, [weeksToShow]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.animalId) newErrors.animalId = 'Select an animal';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.weight || parseFloat(formData.weight) <= 0) {
      newErrors.weight = 'Enter a valid weight';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const animalIdKey = String(formData.animalId).trim();
      const animal = animals.find(a => String(getId(a)) === animalIdKey);
      
      // Backend calculates previousWeight automatically - don't send it
      const weightData = {
        animal: animalIdKey,
        animalTagId: animal?.tagId,
        animalName: animal?.name,
        date: formData.date,
        weight: parseFloat(formData.weight)
      };

      const response = await healthAPI.createWeightRecord(weightData);
      
      if (response.success) {
        // Backend updates animal weight automatically via WeightRecord pre-save hook.
        // Update local state optimistically.
        setAnimals(prev => prev.map(a => 
          String(getId(a)) === animalIdKey 
            ? { ...a, weight: parseFloat(formData.weight), weightDate: formData.date }
            : a
        ));
        setWeightRecords(prev => [response.data, ...prev]);
        
        toast.success('Weight recorded successfully');
        closeModal();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to record weight');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (animal = null) => {
    setSelectedAnimal(animal);
    setFormData({
      animalId: animal ? String(getId(animal)) : '',
      date: new Date().toISOString().split('T')[0],
      weight: ''
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAnimal(null);
    setFormData({
      animalId: '',
      date: new Date().toISOString().split('T')[0],
      weight: ''
    });
    setErrors({});
  };

  const filteredAnimals = useMemo(() => {
    let list = filterBySearch(animals, search, ['tagId', 'name', 'breedType']);
    if (penFilter) {
      list = list.filter(a => String(getAnimalPenId(a) || '') === String(penFilter));
    }
    if (sexFilter) {
      list = list.filter(a => a.sex === sexFilter);
    }
    if (breedFilter) {
      list = list.filter(a => a.breedType === breedFilter);
    }
    const min = minWeight === '' ? null : parseFloat(minWeight);
    const max = maxWeight === '' ? null : parseFloat(maxWeight);
    if (min !== null && !isNaN(min)) {
      list = list.filter(a => (Number(a.weight) || 0) >= min);
    }
    if (max !== null && !isNaN(max)) {
      list = list.filter(a => (Number(a.weight) || 0) <= max);
    }
    return list;
  }, [animals, search, penFilter, sexFilter, breedFilter, minWeight, maxWeight]);

  const weekColumns = useMemo(() => {
    const weeksWindow = Number.isFinite(Number(weeksToShow)) && Number(weeksToShow) > 0
      ? Number(weeksToShow)
      : 12;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const cols = [];
    for (let i = weeksWindow - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - (i * 7));
      const weekStart = getWeekStartISO(d);
      cols.push(weekStart);
    }
    // de-dup in case of edge conditions
    return Array.from(new Set(cols));
  }, [weeksToShow]);

  const weightsByAnimalWeek = useMemo(() => {
    // Map: animalId -> weekStartISO -> { weight, date }
    const map = new Map();
    for (const r of weightRecords || []) {
      const animalId = String(r.animal?._id || r.animal || r.animalId || '').trim();
      if (!animalId) continue;
      const weekStart = getWeekStartISO(r.date);
      if (!weekStart) continue;
      if (!weekColumns.includes(weekStart)) continue;

      const key = `${animalId}|${weekStart}`;
      const existing = map.get(key);
      const rDate = new Date(r.date);
      if (!existing || (existing.date && new Date(existing.date) < rDate)) {
        map.set(key, { weight: r.weight, date: r.date });
      }
    }
    return map;
  }, [weightRecords, weekColumns]);

  const exportToExcel = () => {
    if (!filteredAnimals.length) {
      toast.error('No animals to export (check your filters)');
      return;
    }

    const headers = ['Tag ID', 'Name', 'Pen', 'Sex', 'Breed', 'Current Weight (kg)'];
    const weekHeaders = weekColumns.map(w => `Week of ${w}`);
    const aoa = [headers.concat(weekHeaders)];

    for (const a of filteredAnimals) {
      const animalId = String(getId(a));
      const row = [
        a.tagId || '',
        a.name || '',
        getAnimalPenName(a),
        a.sex || '',
        a.breedType || '',
        Number(a.weight) || 0
      ];

      for (const w of weekColumns) {
        const cell = weightsByAnimalWeek.get(`${animalId}|${w}`);
        row.push(cell?.weight ?? '');
      }
      aoa.push(row);
    }

    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    sheet['!cols'] = aoa[0].map(() => ({ wch: 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'BodyWeights');

    const instructions = [
      ['Body Weight Import/Export'],
      [''],
      ['How to import:'],
      ['- Keep the same headers'],
      ['- Fill weight cells with numeric values (kg)'],
      ['- Leave empty cells blank (no update)'],
      ['- Tag ID is used to match animals'],
      [''],
      ['Note: Week columns use the week-start date (Monday). The import will record weight on that date.']
    ];
    const insSheet = XLSX.utils.aoa_to_sheet(instructions);
    insSheet['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(wb, insSheet, 'Instructions');

    XLSX.writeFile(wb, `body_weight_${toISODate(new Date())}.xlsx`);
    toast.success('Excel exported');
  };

  const openImport = () => {
    setImportErrors([]);
    setImportPreview([]);
    if (importInputRef.current) importInputRef.current.value = '';
    setImportOpen(true);
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportErrors([]);
    setImportPreview([]);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const parseImportExcel = async (file) => {
    setImportErrors([]);
    setImportPreview([]);

    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        if (!rows.length) {
          toast.error('No data found in the Excel file');
          return;
        }

        const animalByTag = new Map(
          animals.map(a => [String(a.tagId || '').trim().toLowerCase(), a])
        );

        const parsed = [];
        const errorsList = [];

        // detect week columns
        const first = rows[0] || {};
        const allKeys = Object.keys(first);
        const weekKeys = allKeys.filter(k => String(k).toLowerCase().startsWith('week of '));
        if (!allKeys.includes('Tag ID')) {
          errorsList.push('Missing required column: Tag ID');
        }
        if (!weekKeys.length) {
          errorsList.push('No week columns found. Expected columns like: "Week of YYYY-MM-DD"');
        }

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const tagIdRaw = String(r['Tag ID'] ?? '').trim();
          const tagKey = tagIdRaw.toLowerCase();
          const animal = animalByTag.get(tagKey);

          if (!tagIdRaw) {
            errorsList.push(`Row ${i + 2}: Tag ID is missing`);
            continue;
          }
          if (!animal) {
            errorsList.push(`Row ${i + 2}: Tag ID "${tagIdRaw}" not found in your animals`);
            continue;
          }

          for (const wk of weekKeys) {
            const wkDateStr = String(wk).replace(/^Week of\s*/i, '').trim();
            const wkISO = toISODate(wkDateStr);
            if (!wkISO) {
              errorsList.push(`Header "${wk}": invalid date. Use YYYY-MM-DD`);
              continue;
            }

            const val = r[wk];
            if (val === null || val === undefined || String(val).trim() === '') continue;

            const num = parseFloat(String(val).replace(/,/g, ''));
            if (isNaN(num) || num <= 0) {
              errorsList.push(`Row ${i + 2} (${tagIdRaw}) ${wk}: invalid weight "${val}"`);
              continue;
            }

            parsed.push({
              tagId: tagIdRaw,
              animalId: String(getId(animal)),
              animalName: animal.name,
              penName: getAnimalPenName(animal),
              weekStart: wkISO,
              date: wkISO,
              weight: num,
              status: 'ready',
              errors: []
            });
          }
        }

        // de-dup updates: keep last occurrence
        const dedup = new Map();
        for (const item of parsed) {
          dedup.set(`${item.animalId}|${item.date}`, item);
        }
        const finalPreview = Array.from(dedup.values());

        setImportPreview(finalPreview);
        setImportErrors(errorsList);

        if (errorsList.length) {
          toast.error('Some issues found in the file. Please review.');
        } else {
          toast.success(`${finalPreview.length} weight update(s) ready`);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse Excel file. Please check the format.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const applyImport = async () => {
    if (!importPreview.length) {
      toast.error('No updates to apply');
      return;
    }
    if (importErrors.length) {
      toast.error('Please fix the errors before importing');
      return;
    }

    setImporting(true);
    let ok = 0;
    let fail = 0;
    const failures = [];

    const chunkSize = 25; // number of concurrent requests per batch
    const pauseMs = 300; // pause between batches to avoid rate limits

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < importPreview.length; i += chunkSize) {
      const chunk = importPreview.slice(i, i + chunkSize);
      // Launch chunk in parallel
      const results = await Promise.all(chunk.map(async (item) => {
        try {
          const payload = {
            animal: item.animalId,
            date: item.date,
            weight: item.weight
          };
          const res = await healthAPI.createWeightRecord(payload);
          return { item, res };
        } catch (e) {
          return { item, err: e };
        }
      }));

      // Process results
      for (const r of results) {
        const { item, res, err } = r;
        if (err) {
          fail++;
          failures.push(`${item.tagId} (${item.date}): ${err.message || 'Failed'}`);
        } else if (res?.success) {
          ok++;
          setWeightRecords(prev => [res.data, ...prev]);
          setAnimals(prev => prev.map(a => (String(getId(a)) === item.animalId ? { ...a, weight: item.weight, weightDate: item.date } : a)));
        } else {
          fail++;
          failures.push(`${item.tagId} (${item.date}): ${res?.message || 'Failed'}`);
        }
      }

      // brief pause between batches
      if (i + chunkSize < importPreview.length) await sleep(pauseMs);
    }

    setImporting(false);
    if (fail === 0) {
      toast.success(`Imported ${ok} record(s)`);
      closeImport();
    } else {
      setImportErrors([
        `Imported ${ok} record(s).`,
        `${fail} failed:`,
        ...failures.slice(0, 20)
      ]);
      toast.error(`${fail} update(s) failed`);
    }
  };

  // Stats
  const avgWeight = animals.length > 0 
    ? (animals.reduce((sum, a) => sum + (a.weight || 0), 0) / animals.length).toFixed(1)
    : 0;
  const totalWeight = animals.reduce((sum, a) => sum + (a.weight || 0), 0);
  const weightedThisMonth = weightRecords.filter(w => {
    const recordDate = new Date(w.date);
    const now = new Date();
    return recordDate.getMonth() === now.getMonth() && 
           recordDate.getFullYear() === now.getFullYear();
  }).length;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Body Weight Tracking"
        subtitle="Track weights weekly with filters + Excel import/export"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Body Weight' }
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={HiOutlineDocumentDownload} onClick={exportToExcel}>
              Export Excel
            </Button>
            <Button variant="outline" icon={HiOutlineCloudUpload} onClick={openImport}>
              Import Excel
            </Button>
            <Button icon={HiOutlinePlus} onClick={() => openModal()}>
              Record Weight
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Animals</p>
                <p className="text-2xl font-bold mt-1">{animals.length}</p>
              </div>
              <HiOutlineScale className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Average Weight</p>
                <p className="text-2xl font-bold mt-1">{avgWeight} kg</p>
              </div>
              <HiOutlineTrendingUp className="w-8 h-8 text-emerald-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Weight</p>
                <p className="text-2xl font-bold mt-1">{totalWeight} kg</p>
              </div>
              <HiOutlineScale className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Weighed This Month</p>
                <p className="text-2xl font-bold mt-1">{weightedThisMonth}</p>
              </div>
              <HiOutlineTrendingUp className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters + Weekly Weight Table */}
      <Card>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Weekly Weight Table</h3>
              <p className="text-sm text-gray-500">
                {filteredAnimals.length} animal(s) • {weekColumns.length} week column(s)
              </p>
            </div>
            <div className="w-full lg:w-72">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by Tag ID, name, breed..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <Select
              label="Pen"
              name="penFilter"
              value={penFilter}
              onChange={(e) => setPenFilter(e.target.value)}
              options={[
                { value: '', label: 'All Pens' },
                ...pens.map(p => ({ value: String(getId(p)), label: p.name }))
              ]}
              placeholder="All Pens"
            />
            <Select
              label="Sex"
              name="sexFilter"
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value)}
              options={[
                { value: '', label: 'All' },
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' }
              ]}
              placeholder="All"
            />
            <Select
              label="Breed"
              name="breedFilter"
              value={breedFilter}
              onChange={(e) => setBreedFilter(e.target.value)}
              options={[
                { value: '', label: 'All' },
                ...Array.from(new Set(animals.map(a => a.breedType).filter(Boolean))).sort().map(b => ({ value: b, label: b }))
              ]}
              placeholder="All"
            />
            <Input
              label="Min Weight (kg)"
              type="number"
              value={minWeight}
              onChange={(e) => setMinWeight(e.target.value)}
              placeholder="e.g. 30"
            />
            <Input
              label="Max Weight (kg)"
              type="number"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              placeholder="e.g. 80"
            />
            <Select
              label="Weeks"
              name="weeksToShow"
              value={String(weeksToShow)}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                setWeeksToShow(Number.isFinite(next) && next > 0 ? next : 12);
              }}
              options={[
                { value: '4', label: 'Last 4 weeks' },
                { value: '8', label: 'Last 8 weeks' },
                { value: '12', label: 'Last 12 weeks' },
                { value: '24', label: 'Last 24 weeks' }
              ]}
              placeholder="Weeks"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Animal</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-[220px] bg-gray-50 z-10 hidden md:table-cell">Pen</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
                {weekColumns.map(w => (
                  <th key={w} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    {w}
                  </th>
                ))}
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAnimals.length === 0 ? (
                <tr>
                  <td colSpan={4 + weekColumns.length} className="py-12 text-center text-gray-500">
                    No animals match your filters
                  </td>
                </tr>
              ) : (
                filteredAnimals.map(a => {
                  const animalId = String(getId(a));
                  return (
                    <tr key={animalId} className="hover:bg-gray-50">
                      <td className="px-3 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-3 w-[220px]">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <GiSheep className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{a.tagId} • {a.name}</p>
                            <p className="text-xs text-gray-500 truncate">{a.breedType} • {a.sex}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 sticky left-[220px] bg-white z-10 hidden md:table-cell">
                        <span className="text-sm text-gray-700">{getAnimalPenName(a)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div>
                          <span className="font-semibold text-gray-900">{Number(a.weight) || 0}</span>
                          <span className="text-xs text-gray-500"> kg</span>
                          <p className="text-xs text-gray-400">
                            {a.weightDate ? formatDate(a.weightDate).split(',')[0] : 'No date'}
                          </p>
                        </div>
                      </td>
                      {weekColumns.map((w, wi) => {
                        const cell = weightsByAnimalWeek.get(`${animalId}|${w}`);
                        const currentWeight = cell?.weight != null ? Number(cell.weight) : null;
                        const prevWeek = wi > 0 ? weekColumns[wi - 1] : null;
                        const prevCell = prevWeek ? weightsByAnimalWeek.get(`${animalId}|${prevWeek}`) : null;
                        const prevWeight = prevCell?.weight != null ? Number(prevCell.weight) : null;

                        let cellBg = '';
                        if (currentWeight != null) {
                          if (prevWeight == null) {
                            cellBg = 'bg-yellow-100 text-yellow-900';
                          } else if (currentWeight > prevWeight) {
                            cellBg = 'bg-green-100 text-green-800';
                          } else if (currentWeight < prevWeight) {
                            cellBg = 'bg-red-100 text-red-800';
                          } else {
                            cellBg = 'bg-yellow-100 text-yellow-900';
                          }
                        }

                        return (
                          <td key={w} className={`px-3 py-3 text-center whitespace-nowrap ${cellBg || ''}`}>
                            {currentWeight != null ? (
                              <span className="text-sm font-medium">{cell.weight}</span>
                            ) : (
                              <span className="text-sm text-gray-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={HiOutlinePlus}
                          onClick={() => openModal(a)}
                        >
                          Add
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Weight Records Table */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Weight Records</h3>
        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Animal</TableHeader>
            <TableHeader>Previous Weight</TableHeader>
            <TableHeader>New Weight</TableHeader>
            <TableHeader>Change</TableHeader>
          </TableHead>
          <TableBody>
            {weightRecords.slice(0, 10).length === 0 ? (
              <TableEmpty
                message="No weight records yet"
                colSpan={5}
              />
            ) : (
              weightRecords.slice(0, 10).map((record) => {
                const change = record.weight - (record.previousWeight || 0);
                return (
                  <TableRow key={getId(record)}>
                    <TableCell>
                      <span className="text-sm">{formatDate(record.date)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <GiSheep className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{record.tagId}</p>
                          <p className="text-xs text-gray-500">{record.animalName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-500">{record.previousWeight || 0} kg</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{record.weight} kg</span>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        change > 0 
                          ? 'bg-emerald-100 text-emerald-700'
                          : change < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {change > 0 ? (
                          <HiOutlineTrendingUp className="w-4 h-4" />
                        ) : change < 0 ? (
                          <HiOutlineTrendingDown className="w-4 h-4" />
                        ) : null}
                        <span className="font-medium">
                          {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Import Excel Modal */}
      <Modal
        isOpen={importOpen}
        onClose={closeImport}
        title="Import Body Weights (Excel)"
        size="lg"
      >
        <div className="space-y-5">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-700">
              Upload the Excel you exported from this page. We’ll validate it and show a preview before applying updates.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Required: <span className="font-medium">Tag ID</span> column and week columns like <span className="font-medium">Week of 2026-01-05</span>.
            </p>
          </div>

          <div className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => parseImportExcel(e.target.files?.[0])}
              className="block w-full"
            />
          </div>

          {importErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2">
                <HiOutlineExclamationCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">Issues found</p>
                  <ul className="text-sm text-red-700 mt-2 space-y-1">
                    {importErrors.slice(0, 12).map((e, idx) => (
                      <li key={idx}>- {e}</li>
                    ))}
                    {importErrors.length > 12 && (
                      <li className="text-gray-500">+{importErrors.length - 12} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Preview: <span className="font-semibold text-gray-900">{importPreview.length}</span> update(s)
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={closeImport}>
                Close
              </Button>
              <Button onClick={applyImport} loading={importing} disabled={!importPreview.length || importErrors.length > 0}>
                Apply Import
              </Button>
            </div>
          </div>

          {importPreview.length > 0 && (
            <div className="max-h-[420px] overflow-y-auto border border-gray-200 rounded-xl">
              <Table>
                <TableHead>
                  <TableHeader>Tag</TableHeader>
                  <TableHeader>Animal</TableHeader>
                  <TableHeader>Pen</TableHeader>
                  <TableHeader>Week</TableHeader>
                  <TableHeader>Weight (kg)</TableHeader>
                </TableHead>
                <TableBody>
                  {importPreview.slice(0, 200).map((p, idx) => (
                    <TableRow key={`${p.animalId}-${p.date}-${idx}`}>
                      <TableCell><span className="font-mono text-sm">{p.tagId}</span></TableCell>
                      <TableCell>{p.animalName}</TableCell>
                      <TableCell>{p.penName}</TableCell>
                      <TableCell>{p.weekStart}</TableCell>
                      <TableCell><span className="font-semibold">{p.weight}</span></TableCell>
                    </TableRow>
                  ))}
                  {importPreview.length > 200 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-3">
                        Showing first 200 updates…
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Modal>

      {/* Record Weight Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Record Weight"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Select Animal"
            name="animalId"
            value={formData.animalId}
            onChange={handleChange}
            options={animals.map(a => ({
              value: getId(a),
              label: `${a.tagId} - ${a.name} (Current: ${a.weight || 0} kg)`
            }))}
            placeholder="Choose an animal"
            error={errors.animalId}
            required
            disabled={selectedAnimal !== null}
          />

          {formData.animalId && (
            <div className="p-4 bg-gray-50 rounded-xl">
              {(() => {
                const animal = animals.find(a => String(getId(a)) === String(formData.animalId));
                return animal ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <GiSheep className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{animal.name}</p>
                      <p className="text-sm text-gray-500">
                        Current: {animal.weight || 0} kg • 
                        Last: {animal.weightDate ? formatDate(animal.weightDate) : 'Never'}
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              error={errors.date}
              required
            />
            <Input
              label="Weight"
              type="number"
              name="weight"
              value={formData.weight}
              onChange={handleChange}
              placeholder="Enter weight"
              suffix="kg"
              error={errors.weight}
              required
            />
          </div>

          {formData.weight && formData.animalId && (
            <div className="p-4 bg-emerald-50 rounded-xl">
              {(() => {
                const animal = animals.find(a => String(getId(a)) === String(formData.animalId));
                const change = parseFloat(formData.weight) - (animal?.weight || 0);
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Weight Change:</span>
                    <span className={`font-semibold ${
                      change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Record Weight
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BodyWeight;
