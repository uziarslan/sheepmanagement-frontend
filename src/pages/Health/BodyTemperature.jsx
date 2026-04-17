import React, { useMemo, useRef, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineFire,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineDocumentDownload,
  HiOutlineCloudUpload,
  HiOutlineExclamationCircle,
  HiOutlineCalendar
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import ExcelJS from 'exceljs';
import { animalAPI, healthAPI, penAPI } from '../../services/api';
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

const getWeekStartISO = (dateLike) => {
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return '';
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return toISODate(copy);
};

const formatWeekShort = (isoDate) => {
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fetchAllPages = async (fetchFn, { limit = 100, maxPages = 50 } = {}) => {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchFn({ page, limit });
    if (!res?.success) throw new Error(res?.message || 'Request failed');
    const chunk = Array.isArray(res.data) ? res.data : [];
    all.push(...chunk);
    if (chunk.length < limit) break;
  }
  return all;
};

const BodyTemperature = () => {
  const [animals, setAnimals] = useState([]);
  const [temperatureRecords, setTemperatureRecords] = useState([]);
  const [pens, setPens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tempLoading, setTempLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [penFilter, setPenFilter] = useState('');
  const [sexFilter, setSexFilter] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [minTemp, setMinTemp] = useState('');
  const [maxTemp, setMaxTemp] = useState('');
  const [weeksToShow, setWeeksToShow] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [formData, setFormData] = useState({
    animalId: '',
    date: new Date().toISOString().split('T')[0],
    temperature: ''
  });
  const [errors, setErrors] = useState({});

  const importInputRef = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const lastFetchErrorRef = useRef('');

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

  // ── Phase 1: Fetch animals + pens on mount ──
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [animalsAll, pensAll] = await Promise.all([
          fetchAllPages((p) => animalAPI.getAll({ ...p, status: 'Active', sort: 'tagId' })),
          fetchAllPages((p) => penAPI.getAll({ ...p, sort: 'name' }), { maxPages: 20 })
        ]);
        setAnimals((animalsAll || []).filter(a => a.status === 'Active'));
        setPens(pensAll || []);
      } catch (error) {
        const msg = error?.message || 'Failed to fetch data';
        if (lastFetchErrorRef.current !== msg) {
          toast.error(msg);
          lastFetchErrorRef.current = msg;
          setTimeout(() => { if (lastFetchErrorRef.current === msg) lastFetchErrorRef.current = ''; }, 1500);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBaseData();
  }, []);

  // ── Phase 2: Fetch temperature records when time range changes ──
  useEffect(() => {
    if (!animals.length) return;
    let cancelled = false;

    const fetchTemperatures = async () => {
      setTempLoading(true);
      try {
        const params = { sort: '-date' };
        if (weeksToShow !== 'all') {
          const n = parseInt(weeksToShow) || 12;
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          const start = new Date(end);
          start.setDate(start.getDate() - (n * 7) + 1);
          start.setHours(0, 0, 0, 0);
          params.startDate = toISODate(start);
          params.endDate = toISODate(end);
        }

        const recordsAll = await fetchAllPages(
          (p) => healthAPI.getTemperatureRecords({ ...p, ...params }),
          { limit: 100, maxPages: weeksToShow === 'all' ? 100 : 20 }
        );
        if (!cancelled) setTemperatureRecords(recordsAll || []);
      } catch (error) {
        if (!cancelled) {
          const msg = error?.message || 'Failed to fetch temperature records';
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setTempLoading(false);
      }
    };

    fetchTemperatures();
    return () => { cancelled = true; };
  }, [weeksToShow, animals.length]);

  // ── Batches: group animals by arrival month ──
  const batches = useMemo(() => {
    const map = new Map();
    for (const a of animals) {
      const d = a.arrivalDate ? new Date(a.arrivalDate) : null;
      if (!d || isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        map.set(key, { key, label, animalIds: new Set(), earliestDate: d, latestDate: d });
      }
      const batch = map.get(key);
      batch.animalIds.add(String(getId(a)));
      if (d < batch.earliestDate) batch.earliestDate = d;
      if (d > batch.latestDate) batch.latestDate = d;
    }
    return Array.from(map.values())
      .map(b => ({ ...b, count: b.animalIds.size }))
      .sort((a, b) => b.earliestDate - a.earliestDate);
  }, [animals]);

  // ── Animals in selected batch ──
  const batchAnimals = useMemo(() => {
    if (selectedBatch === 'all') return animals;
    const batch = batches.find(b => b.key === selectedBatch);
    if (!batch) return animals;
    return animals.filter(a => batch.animalIds.has(String(getId(a))));
  }, [animals, selectedBatch, batches]);

  // ── Filtered animals (search + filters on top of batch) ──
  const filteredAnimals = useMemo(() => {
    let list = filterBySearch(batchAnimals, search, ['tagId', 'name', 'breedType']);
    if (penFilter) list = list.filter(a => String(getAnimalPenId(a) || '') === String(penFilter));
    if (sexFilter) list = list.filter(a => a.sex === sexFilter);
    if (breedFilter) list = list.filter(a => a.breedType === breedFilter);
    const min = minTemp === '' ? null : parseFloat(minTemp);
    const max = maxTemp === '' ? null : parseFloat(maxTemp);
    if (min !== null && !isNaN(min)) {
      list = list.filter(a => {
        const lastTemp = temperatureRecords.find(r => String(r.animal?._id || r.animal || '') === String(getId(a)));
        return lastTemp ? Number(lastTemp.temperature) >= min : true;
      });
    }
    if (max !== null && !isNaN(max)) {
      list = list.filter(a => {
        const lastTemp = temperatureRecords.find(r => String(r.animal?._id || r.animal || '') === String(getId(a)));
        return lastTemp ? Number(lastTemp.temperature) <= max : true;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchAnimals, search, penFilter, sexFilter, breedFilter, minTemp, maxTemp, temperatureRecords, pens]);

  // ── Dynamic week columns (per batch or global) ──
  const weekColumns = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentWeekStart = getWeekStartISO(now);
    if (!currentWeekStart) return [];

    let batchStart = null;
    if (selectedBatch !== 'all') {
      const batch = batches.find(b => b.key === selectedBatch);
      if (batch) batchStart = batch.earliestDate;
    } else {
      for (const a of animals) {
        const d = a.arrivalDate ? new Date(a.arrivalDate) : null;
        if (d && !isNaN(d.getTime()) && (!batchStart || d < batchStart)) batchStart = d;
      }
    }

    if (!batchStart) {
      batchStart = new Date(now);
      batchStart.setDate(batchStart.getDate() - 12 * 7);
    }

    let effectiveStart;
    if (weeksToShow === 'all') {
      effectiveStart = batchStart;
    } else {
      const n = parseInt(weeksToShow) || 12;
      const limitStart = new Date(now);
      limitStart.setDate(limitStart.getDate() - n * 7);
      effectiveStart = limitStart > batchStart ? limitStart : batchStart;
    }

    const startWeek = getWeekStartISO(effectiveStart);
    if (!startWeek) return [];

    const cols = [];
    const d = new Date(startWeek + 'T00:00:00');
    const end = new Date(currentWeekStart + 'T00:00:00');
    while (d <= end) {
      cols.push(toISODate(d));
      d.setDate(d.getDate() + 7);
    }
    return cols;
  }, [selectedBatch, batches, weeksToShow, animals]);

  // ── Batch-relative week number ──
  const batchFirstWeek = useMemo(() => {
    if (selectedBatch === 'all') return null;
    const batch = batches.find(b => b.key === selectedBatch);
    if (!batch) return null;
    return getWeekStartISO(batch.earliestDate);
  }, [selectedBatch, batches]);

  const getWeekNumber = (weekISO) => {
    if (!batchFirstWeek) return null;
    const start = new Date(batchFirstWeek + 'T00:00:00');
    const current = new Date(weekISO + 'T00:00:00');
    const diffDays = Math.round((current - start) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  // ── Temperature lookup map: animalId|weekStart → { temperature, date } ──
  const tempsByAnimalWeek = useMemo(() => {
    const map = new Map();
    const weekSet = new Set(weekColumns);
    for (const r of temperatureRecords || []) {
      const animalId = String(r.animal?._id || r.animal || r.animalId || '').trim();
      if (!animalId) continue;
      const weekStart = getWeekStartISO(r.date);
      if (!weekStart || !weekSet.has(weekStart)) continue;

      const key = `${animalId}|${weekStart}`;
      const existing = map.get(key);
      const rDate = new Date(r.date);
      if (!existing || new Date(existing.date) < rDate) {
        map.set(key, { temperature: r.temperature, date: r.date });
      }
    }
    return map;
  }, [temperatureRecords, weekColumns]);

  // ── Form handlers ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.animalId) newErrors.animalId = 'Select an animal';
    if (!formData.date) newErrors.date = 'Date is required';
    const temp = parseFloat(formData.temperature);
    if (!formData.temperature || isNaN(temp) || temp < 20 || temp > 50) {
      newErrors.temperature = 'Enter a valid temperature (20–50°C)';
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
      const tempData = {
        animal: animalIdKey,
        animalTagId: animal?.tagId,
        animalName: animal?.name,
        date: formData.date,
        temperature: parseFloat(formData.temperature)
      };

      const response = await healthAPI.createTemperatureRecord(tempData);
      if (response.success) {
        setTemperatureRecords(prev => [response.data, ...prev]);
        toast.success('Temperature recorded successfully');
        closeModal();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to record temperature');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (animal = null) => {
    setSelectedAnimal(animal);
    setFormData({
      animalId: animal ? String(getId(animal)) : '',
      date: new Date().toISOString().split('T')[0],
      temperature: ''
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAnimal(null);
    setFormData({ animalId: '', date: new Date().toISOString().split('T')[0], temperature: '' });
    setErrors({});
  };

  // ── Import handlers ──
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

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];

      const headers = [];
      worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colIdx) => {
        headers[colIdx - 1] = cell.value != null ? String(cell.value).trim() : '';
      });

      const rows = [];
      worksheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const obj = {};
        headers.forEach((h, i) => {
          const cell = row.getCell(i + 1);
          obj[h] = cell.value != null ? String(cell.value).trim() : '';
        });
        rows.push(obj);
      });

      if (!rows.length) {
        toast.error('No data found in the Excel file');
        return;
      }

      const animalByTag = new Map(
        animals.map(a => [String(a.tagId || '').trim().toLowerCase(), a])
      );

      const parsed = [];
      const errorsList = [];
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

        if (!tagIdRaw) { errorsList.push(`Row ${i + 2}: Tag ID is missing`); continue; }
        if (!animal) { errorsList.push(`Row ${i + 2}: Tag ID "${tagIdRaw}" not found in your animals`); continue; }

        for (const wk of weekKeys) {
          const wkDateStr = String(wk).replace(/^Week of\s*/i, '').trim();
          const wkISO = toISODate(wkDateStr);
          if (!wkISO) { errorsList.push(`Header "${wk}": invalid date. Use YYYY-MM-DD`); continue; }

          const val = r[wk];
          if (val === null || val === undefined || String(val).trim() === '') continue;

          const num = parseFloat(String(val).replace(/,/g, ''));
          if (isNaN(num) || num < 20 || num > 50) {
            errorsList.push(`Row ${i + 2} (${tagIdRaw}) ${wk}: invalid temperature "${val}" (must be 20–50°C)`);
            continue;
          }

          parsed.push({
            tagId: tagIdRaw,
            animalId: String(getId(animal)),
            animalName: animal.name,
            penName: getAnimalPenName(animal),
            weekStart: wkISO,
            date: wkISO,
            temperature: num,
            status: 'ready',
            errors: []
          });
        }
      }

      const dedup = new Map();
      for (const item of parsed) dedup.set(`${item.animalId}|${item.date}`, item);
      const finalPreview = Array.from(dedup.values());

      setImportPreview(finalPreview);
      setImportErrors(errorsList);

      if (errorsList.length) {
        toast.error('Some issues found in the file. Please review.');
      } else {
        toast.success(`${finalPreview.length} temperature update(s) ready`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse Excel file. Please check the format.');
    }
  };

  const applyImport = async () => {
    if (!importPreview.length) { toast.error('No updates to apply'); return; }
    if (importErrors.length) { toast.error('Please fix the errors before importing'); return; }

    setImporting(true);
    let ok = 0;
    let fail = 0;
    const failures = [];
    const chunkSize = 25;
    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

    for (let i = 0; i < importPreview.length; i += chunkSize) {
      const chunk = importPreview.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(async (item) => {
        try {
          const res = await healthAPI.createTemperatureRecord({
            animal: item.animalId,
            date: item.date,
            temperature: item.temperature
          });
          return { item, res };
        } catch (e) {
          return { item, err: e };
        }
      }));

      for (const r of results) {
        const { item, res, err } = r;
        if (err) {
          fail++;
          failures.push(`${item.tagId} (${item.date}): ${err.message || 'Failed'}`);
        } else if (res?.success) {
          ok++;
          setTemperatureRecords(prev => [res.data, ...prev]);
        } else {
          fail++;
          failures.push(`${item.tagId} (${item.date}): ${res?.message || 'Failed'}`);
        }
      }
      if (i + chunkSize < importPreview.length) await sleep(300);
    }

    setImporting(false);
    if (fail === 0) {
      toast.success(`Imported ${ok} record(s)`);
      closeImport();
    } else {
      setImportErrors([`Imported ${ok} record(s).`, `${fail} failed:`, ...failures.slice(0, 20)]);
      toast.error(`${fail} update(s) failed`);
    }
  };

  // ── Export to Excel ──
  const exportToExcel = async () => {
    if (!filteredAnimals.length) {
      toast.error('No animals to export (check your filters)');
      return;
    }

    const selectedBatchData = batches.find(b => b.key === selectedBatch);
    const sheetLabel = selectedBatchData ? `${selectedBatchData.label} Batch` : 'All Animals';

    const headers = ['Tag ID', 'Name', 'Pen', 'Sex', 'Breed'];
    const weekHeaders = weekColumns.map(w => `Week of ${w}`);
    const aoa = [headers.concat(weekHeaders)];

    for (const a of filteredAnimals) {
      const animalId = String(getId(a));
      const row = [
        a.tagId || '', a.name || '', getAnimalPenName(a),
        a.sex || '', a.breedType || ''
      ];
      for (const w of weekColumns) {
        const cell = tempsByAnimalWeek.get(`${animalId}|${w}`);
        row.push(cell?.temperature ?? '');
      }
      aoa.push(row);
    }

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(sheetLabel);
    sheet.columns = aoa[0].map(() => ({ width: 18 }));
    sheet.addRows(aoa);

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };

    const instructions = [
      ['Body Temperature Import/Export'],
      [''],
      [selectedBatchData ? `Batch: ${selectedBatchData.label} (${selectedBatchData.count} animals)` : 'All Animals'],
      [''],
      ['How to import:'],
      ['- Keep the same headers'],
      ['- Fill temperature cells with numeric values (°C, range 20–50)'],
      ['- Leave empty cells blank (no update)'],
      ['- Tag ID is used to match animals'],
      ['- You can add new "Week of YYYY-MM-DD" columns for additional weeks'],
      [''],
      ['Note: Week columns use the week-start date (Monday). The import will record temperature on that date.']
    ];
    const insSheet = wb.addWorksheet('Instructions');
    insSheet.getColumn(1).width = 70;
    insSheet.addRows(instructions);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const batchSuffix = selectedBatchData ? `_${selectedBatchData.key}` : '';
    a.download = `body_temperature${batchSuffix}_${toISODate(new Date())}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Excel exported');
  };

  // ── Stats (scoped to selected batch) ──
  const batchAnimalIds = useMemo(() => {
    return new Set(batchAnimals.map(a => String(getId(a))));
  }, [batchAnimals]);

  const batchTempRecords = useMemo(() => {
    return temperatureRecords.filter(r => {
      const animalId = String(r.animal?._id || r.animal || r.animalId || '');
      return batchAnimalIds.has(animalId);
    });
  }, [temperatureRecords, batchAnimalIds]);

  const avgTemperature = useMemo(() => {
    if (!batchTempRecords.length) return '—';
    const sum = batchTempRecords.reduce((acc, r) => acc + (Number(r.temperature) || 0), 0);
    return (sum / batchTempRecords.length).toFixed(1);
  }, [batchTempRecords]);

  const recordedThisMonth = useMemo(() => {
    const now = new Date();
    return batchTempRecords.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [batchTempRecords]);

  const highTempCount = useMemo(() => {
    return batchTempRecords.filter(r => Number(r.temperature) > 40).length;
  }, [batchTempRecords]);

  const recentRecords = useMemo(() => {
    if (selectedBatch === 'all') return temperatureRecords.slice(0, 10);
    return temperatureRecords
      .filter(r => batchAnimalIds.has(String(r.animal?._id || r.animal || r.animalId || '')))
      .slice(0, 10);
  }, [temperatureRecords, selectedBatch, batchAnimalIds]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Body Temperature Tracking"
        subtitle="Track temperatures weekly by batch with filters + Excel import/export"
        breadcrumbs={[
          { label: 'Health Management' },
          { label: 'Body Temperature' }
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
              Record Temperature
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
                <p className="text-blue-100 text-sm">
                  {selectedBatch !== 'all' ? 'Batch Animals' : 'Total Animals'}
                </p>
                <p className="text-2xl font-bold mt-1">{batchAnimals.length}</p>
              </div>
              <HiOutlineFire className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Avg Temperature</p>
                <p className="text-2xl font-bold mt-1">{avgTemperature !== '—' ? `${avgTemperature} °C` : '—'}</p>
              </div>
              <HiOutlineTrendingUp className="w-8 h-8 text-emerald-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">High Temp (&gt;40°C)</p>
                <p className="text-2xl font-bold mt-1">{highTempCount}</p>
              </div>
              <HiOutlineFire className="w-8 h-8 text-red-200" />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Recorded This Month</p>
                <p className="text-2xl font-bold mt-1">{recordedThisMonth}</p>
              </div>
              <HiOutlineTrendingUp className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        {/* Batch Tabs */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Batch (by arrival month)</p>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-gray-200">
            <button
              onClick={() => setSelectedBatch('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                selectedBatch === 'all'
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Animals
              <span className="ml-1.5 text-xs font-normal opacity-70">({animals.length})</span>
            </button>
            {batches.map(b => (
              <button
                key={b.key}
                onClick={() => setSelectedBatch(b.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  selectedBatch === b.key
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {b.label}
                <span className="ml-1.5 text-xs font-normal opacity-70">({b.count})</span>
              </button>
            ))}
            {batches.length === 0 && (
              <span className="text-sm text-gray-400 italic px-3">No batches detected (animals need arrival dates)</span>
            )}
          </div>

          {/* Batch info banner */}
          {selectedBatch !== 'all' && (() => {
            const b = batches.find(x => x.key === selectedBatch);
            return b ? (
              <div className="mt-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3 text-sm">
                <HiOutlineCalendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-blue-800">
                  <span className="font-medium">{b.label} Batch</span>
                  {' \u2014 '}{b.count} animal{b.count !== 1 ? 's' : ''}
                  {' \u2022 '}Arrived from {formatWeekShort(toISODate(b.earliestDate))}
                  {' \u2022 '}{weekColumns.length} week{weekColumns.length !== 1 ? 's' : ''} tracked
                </span>
              </div>
            ) : null;
          })()}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Weekly Temperature Table</h3>
              <p className="text-sm text-gray-500">
                {filteredAnimals.length} animal(s) &bull; {weekColumns.length} week column(s)
                {tempLoading && <span className="ml-2 text-blue-500 animate-pulse">Loading temperatures...</span>}
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
              label="Min Temp (°C)"
              type="number"
              value={minTemp}
              onChange={(e) => setMinTemp(e.target.value)}
              placeholder="e.g. 38"
            />
            <Input
              label="Max Temp (°C)"
              type="number"
              value={maxTemp}
              onChange={(e) => setMaxTemp(e.target.value)}
              placeholder="e.g. 40"
            />
            <Select
              label="Time Range"
              name="weeksToShow"
              value={String(weeksToShow)}
              onChange={(e) => {
                const val = e.target.value;
                setWeeksToShow(val === 'all' ? 'all' : parseInt(val, 10));
              }}
              options={[
                { value: '4', label: 'Last 4 weeks' },
                { value: '8', label: 'Last 8 weeks' },
                { value: '12', label: 'Last 12 weeks' },
                { value: '24', label: 'Last 24 weeks' },
                { value: '52', label: 'Last 52 weeks' },
                { value: 'all', label: 'All Time' }
              ]}
              placeholder="Time Range"
            />
          </div>
        </div>

        {/* Weekly Temperature Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Animal</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-[220px] bg-gray-50 z-10 hidden md:table-cell">Pen</th>
                {weekColumns.map(w => {
                  const wn = getWeekNumber(w);
                  return (
                    <th key={w} className="px-3 py-3 text-center text-xs font-medium text-gray-500 whitespace-nowrap" title={w}>
                      {wn != null && <div className="text-[10px] text-gray-400 font-normal leading-tight">W{wn}</div>}
                      <div>{formatWeekShort(w)}</div>
                    </th>
                  );
                })}
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAnimals.length === 0 ? (
                <tr>
                  <td colSpan={3 + weekColumns.length} className="py-12 text-center text-gray-500">
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
                          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <GiSheep className="w-5 h-5 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{a.tagId} &bull; {a.name}</p>
                            <p className="text-xs text-gray-500 truncate">{a.breedType} &bull; {a.sex}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 sticky left-[220px] bg-white z-10 hidden md:table-cell">
                        <span className="text-sm text-gray-700">{getAnimalPenName(a)}</span>
                      </td>
                      {weekColumns.map((w, wi) => {
                        const cell = tempsByAnimalWeek.get(`${animalId}|${w}`);
                        const currentTemp = cell?.temperature != null ? Number(cell.temperature) : null;
                        const prevWeek = wi > 0 ? weekColumns[wi - 1] : null;
                        const prevCell = prevWeek ? tempsByAnimalWeek.get(`${animalId}|${prevWeek}`) : null;
                        const prevTemp = prevCell?.temperature != null ? Number(prevCell.temperature) : null;

                        let cellBg = '';
                        if (currentTemp != null) {
                          if (currentTemp > 40) {
                            cellBg = 'bg-red-50 text-red-800';
                          } else if (currentTemp < 38.5) {
                            cellBg = 'bg-blue-50 text-blue-800';
                          } else if (prevTemp == null) {
                            cellBg = 'bg-yellow-50 text-yellow-900';
                          } else if (currentTemp > prevTemp) {
                            cellBg = 'bg-orange-50 text-orange-800';
                          } else if (currentTemp < prevTemp) {
                            cellBg = 'bg-green-50 text-green-800';
                          } else {
                            cellBg = 'bg-yellow-50 text-yellow-900';
                          }
                        }

                        return (
                          <td key={w} className={`px-3 py-3 text-center whitespace-nowrap ${cellBg}`}>
                            {currentTemp != null ? (
                              <span className="text-sm font-medium">{cell.temperature}</span>
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

      {/* Recent Temperature Records */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Recent Temperature Records
          {selectedBatch !== 'all' && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({batches.find(b => b.key === selectedBatch)?.label || 'Batch'})
            </span>
          )}
        </h3>
        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Animal</TableHeader>
            <TableHeader>Previous Temp</TableHeader>
            <TableHeader>New Temp</TableHeader>
            <TableHeader>Change</TableHeader>
          </TableHead>
          <TableBody>
            {recentRecords.length === 0 ? (
              <TableEmpty message="No temperature records yet" colSpan={5} />
            ) : (
              recentRecords.map((record) => {
                const change = Number((record.temperature - (record.previousTemperature || 0)).toFixed(2));
                return (
                  <TableRow key={getId(record)}>
                    <TableCell>
                      <span className="text-sm">{formatDate(record.date)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <GiSheep className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{record.tagId || record.animalTagId}</p>
                          <p className="text-xs text-gray-500">{record.animalName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-500">{record.previousTemperature || 0} °C</span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${record.temperature > 40 ? 'text-red-600' : record.temperature < 38.5 ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {record.temperature} °C
                      </span>
                    </TableCell>
                    <TableCell>
                      {record.previousTemperature ? (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                          change > 0
                            ? 'bg-orange-100 text-orange-700'
                            : change < 0
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {change > 0 ? (
                            <HiOutlineTrendingUp className="w-4 h-4" />
                          ) : change < 0 ? (
                            <HiOutlineTrendingDown className="w-4 h-4" />
                          ) : null}
                          <span className="font-medium">
                            {change > 0 ? '+' : ''}{change} °C
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">First record</span>
                      )}
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
        title="Import Body Temperatures (Excel)"
        size="lg"
      >
        <div className="space-y-5">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-700">
              Upload the Excel you exported from this page. We'll validate it and show a preview before applying updates.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Required: <span className="font-medium">Tag ID</span> column and week columns like <span className="font-medium">Week of 2026-01-05</span>.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Temperature values must be numeric and between 20–50°C.
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
              <Button variant="secondary" onClick={closeImport}>Close</Button>
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
                  <TableHeader>Temp (°C)</TableHeader>
                </TableHead>
                <TableBody>
                  {importPreview.slice(0, 200).map((p, idx) => (
                    <TableRow key={`${p.animalId}-${p.date}-${idx}`}>
                      <TableCell><span className="font-mono text-sm">{p.tagId}</span></TableCell>
                      <TableCell>{p.animalName}</TableCell>
                      <TableCell>{p.penName}</TableCell>
                      <TableCell>{p.weekStart}</TableCell>
                      <TableCell><span className="font-semibold">{p.temperature}</span></TableCell>
                    </TableRow>
                  ))}
                  {importPreview.length > 200 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-gray-500 py-3">
                        Showing first 200 updates&hellip;
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Modal>

      {/* Record Temperature Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Record Temperature"
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
              label: `${a.tagId} - ${a.name}`
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
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                      <GiSheep className="w-7 h-7 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold">{animal.name}</p>
                      <p className="text-sm text-gray-500">
                        {animal.tagId} &bull; {animal.breedType} &bull; {animal.sex}
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
              label="Temperature"
              type="number"
              name="temperature"
              value={formData.temperature}
              onChange={handleChange}
              placeholder="e.g. 39.2"
              suffix="°C"
              error={errors.temperature}
              required
              step="0.1"
            />
          </div>

          {formData.temperature && (
            <div className={`p-4 rounded-xl ${
              parseFloat(formData.temperature) > 40
                ? 'bg-red-50'
                : parseFloat(formData.temperature) < 38.5
                  ? 'bg-blue-50'
                  : 'bg-emerald-50'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`font-semibold text-sm ${
                  parseFloat(formData.temperature) > 40
                    ? 'text-red-600'
                    : parseFloat(formData.temperature) < 38.5
                      ? 'text-blue-600'
                      : 'text-emerald-600'
                }`}>
                  {parseFloat(formData.temperature) > 40
                    ? 'High (Fever)'
                    : parseFloat(formData.temperature) < 38.5
                      ? 'Low (Hypothermia risk)'
                      : 'Normal (38.5–40°C)'}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Record Temperature
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BodyTemperature;
