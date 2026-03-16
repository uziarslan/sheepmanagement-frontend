import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlineCash,
  HiOutlineCalendar,
  HiOutlineCreditCard,
  HiOutlineCurrencyRupee,
  HiOutlineUserGroup
} from 'react-icons/hi';
import { employeeAPI, salaryAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  SearchInput
} from '../../components/common';
import Modal from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Spinner';

const EmployeeSalary = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    paymentDate: new Date().toISOString().split('T')[0],
    advanceDeduction: '',
    otherDeductions: '',
    paymentMode: 'Cash',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, salRes] = await Promise.all([
        employeeAPI.getAll(),
        salaryAPI.getAll({
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          limit: 100 // backend max is 100
        })
      ]);
      if (empRes.success) setEmployees(empRes.data || []);
      if (salRes.success) setPayments(salRes.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch salary data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (employee) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    setSelectedEmployee(employee);
    setFormData({
      month: String(currentMonth),
      year: String(currentYear),
      paymentDate: now.toISOString().split('T')[0],
      advanceDeduction: '',
      otherDeductions: '',
      paymentMode: 'Cash',
      notes: ''
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEmployee(null);
    setFormData({
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      paymentDate: new Date().toISOString().split('T')[0],
      advanceDeduction: '',
      otherDeductions: '',
      paymentMode: 'Cash',
      notes: ''
    });
    setErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!selectedEmployee) {
      newErrors.employee = 'Employee is required';
    }
    const m = parseInt(formData.month, 10);
    const y = parseInt(formData.year, 10);
    if (!m || m < 1 || m > 12) {
      newErrors.month = 'Month must be between 1 and 12';
    }
    if (!y || y < 2000) {
      newErrors.year = 'Please enter a valid year';
    }
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }
    const advDed = parseFloat(formData.advanceDeduction || '0');
    const otherDed = parseFloat(formData.otherDeductions || '0');
    if (advDed < 0) {
      newErrors.advanceDeduction = 'Advance deduction cannot be negative';
    }
    if (otherDed < 0) {
      newErrors.otherDeductions = 'Other deductions cannot be negative';
    }
    const empAdv = selectedEmployee?.advanceBalance || 0;
    if (advDed > empAdv) {
      newErrors.advanceDeduction = `Cannot deduct more than advance balance (${formatCurrency(empAdv)})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedEmployee) return;

    setSubmitting(true);
    try {
      const payload = {
        employee: getId(selectedEmployee),
        month: parseInt(formData.month, 10),
        year: parseInt(formData.year, 10),
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        advanceDeduction: parseFloat(formData.advanceDeduction || '0'),
        otherDeductions: parseFloat(formData.otherDeductions || '0'),
        notes: formData.notes || undefined
      };

      const res = await salaryAPI.create(payload);
      if (res.success) {
        toast.success(`Salary paid to ${selectedEmployee.name}`);
        // Update local payments and employee balances
        setPayments((prev) => [res.data, ...prev]);
        setEmployees((prev) =>
          prev.map((emp) =>
            getId(emp) === getId(selectedEmployee)
              ? { ...emp, advanceBalance: Math.max(0, (emp.advanceBalance || 0) - (payload.advanceDeduction || 0)) }
              : emp
          )
        );
        closeModal();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to pay salary');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      e.name.toLowerCase().includes(term) ||
      e.designation?.toLowerCase().includes(term) ||
      e.department?.toLowerCase().includes(term) ||
      e.phone?.toLowerCase().includes(term)
    );
  });

  const monthInt = parseInt(month, 10);
  const yearInt = parseInt(year, 10);
  const paymentsForPeriod = payments.filter(
    (p) => p.month === monthInt && p.year === yearInt
  );

  const getEmployeePaymentForPeriod = (empId) => {
    return paymentsForPeriod
      .filter((p) => String(p.employee?._id || p.employee || p.employeeId) === String(empId))
      .reduce((sum, p) => sum + (p.netSalary || 0), 0);
  };

  const totalMonthlyPayroll = employees.reduce(
    (sum, e) => sum + (e.salary || 0) + (e.allowances || 0),
    0
  );
  const totalPaidThisPeriod = paymentsForPeriod.reduce(
    (sum, p) => sum + (p.netSalary || 0),
    0
  );

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Salaries"
        subtitle="Pay monthly salaries and track salary history"
        breadcrumbs={[
          { label: 'Employees', path: '/dashboard/employees' },
          { label: 'Salaries' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/employees')}
          >
            Back to Employees
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-100 text-sm">Total Monthly Payroll</p>
              <HiOutlineUserGroup className="w-6 h-6 text-emerald-100" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalMonthlyPayroll)}</p>
            <p className="text-emerald-100 text-xs mt-1">
              {employees.length} active employees
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-100 text-sm">
                Paid in {monthInt}/{yearInt}
              </p>
              <HiOutlineCash className="w-6 h-6 text-blue-100" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalPaidThisPeriod)}</p>
            <p className="text-blue-100 text-xs mt-1">
              {formatCurrency(totalMonthlyPayroll - totalPaidThisPeriod)} remaining
            </p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-orange-100 text-sm">Average Salary</p>
              <HiOutlineCurrencyRupee className="w-6 h-6 text-orange-100" />
            </div>
            <p className="text-2xl font-bold">
              {employees.length
                ? formatCurrency(totalMonthlyPayroll / employees.length)
                : formatCurrency(0)}
            </p>
            <p className="text-orange-100 text-xs mt-1">
              Includes basic + allowances
            </p>
          </div>
        </Card>
      </div>

      {/* Filters + Table */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Monthly Payroll</h3>
            <p className="text-sm text-gray-500">
              Select month and year to see salary status
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-32">
              <Select
                label="Month"
                name="monthFilter"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                options={[
                  { value: '1', label: 'Jan' },
                  { value: '2', label: 'Feb' },
                  { value: '3', label: 'Mar' },
                  { value: '4', label: 'Apr' },
                  { value: '5', label: 'May' },
                  { value: '6', label: 'Jun' },
                  { value: '7', label: 'Jul' },
                  { value: '8', label: 'Aug' },
                  { value: '9', label: 'Sep' },
                  { value: '10', label: 'Oct' },
                  { value: '11', label: 'Nov' },
                  { value: '12', label: 'Dec' }
                ]}
              />
            </div>
            <div className="w-32">
              <Input
                label="Year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="2000"
              />
            </div>
            <div className="w-64">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search employee..."
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableHeader>Employee</TableHeader>
              <TableHeader>Department</TableHeader>
              <TableHeader>Designation</TableHeader>
              <TableHeader>Monthly Salary</TableHeader>
              <TableHeader>Advance Balance</TableHeader>
              <TableHeader>Paid (This Month)</TableHeader>
              <TableHeader>Due</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableHead>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableEmpty
                  message={search ? 'No employees match your search' : 'No employees found'}
                  colSpan={8}
                />
              ) : (
                filteredEmployees.map((emp) => {
                  const empId = getId(emp);
                  const gross = (emp.salary || 0) + (emp.allowances || 0);
                  const paid = getEmployeePaymentForPeriod(empId);
                  const due = Math.max(0, gross - paid);
                  return (
                    <TableRow key={empId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-700 font-semibold text-xs">
                              {emp.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.cnic}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">{emp.department}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">{emp.designation}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(emp.salary || 0)}
                          </p>
                          {emp.allowances > 0 && (
                            <p className="text-xs text-emerald-600">
                              +{formatCurrency(emp.allowances)} allowances
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm font-semibold ${
                            (emp.advanceBalance || 0) > 0
                              ? 'text-orange-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {formatCurrency(emp.advanceBalance || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-emerald-700">
                          {formatCurrency(paid)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-sm font-semibold ${
                            due > 0 ? 'text-red-600' : 'text-gray-500'
                          }`}
                        >
                          {formatCurrency(due)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={HiOutlineCash}
                            onClick={() => openModal(emp)}
                          >
                            Pay Salary
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Recent Payments */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Recent Salary Payments</h3>
        </div>
        <Table>
          <TableHead>
            <TableHeader>Date</TableHeader>
            <TableHeader>Employee</TableHeader>
            <TableHeader>Month</TableHeader>
            <TableHeader>Net Salary</TableHeader>
            <TableHeader>Deductions</TableHeader>
            <TableHeader>Mode</TableHeader>
          </TableHead>
          <TableBody>
            {payments.length === 0 ? (
              <TableEmpty message="No salary payments recorded yet" colSpan={6} />
            ) : (
              payments.slice(0, 15).map((p) => (
                <TableRow key={getId(p)}>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <HiOutlineCalendar className="w-4 h-4 text-gray-400" />
                      {formatDate(p.paymentDate || p.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-700 text-xs font-semibold">
                          {(p.employee?.name || '')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.employee?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {p.employee?.designation}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">
                      {p.month}/{p.year}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-emerald-700">
                      {formatCurrency(p.netSalary || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">
                      Adv: {formatCurrency(p.advanceDeduction || 0)}{' '}
                      {p.otherDeductions
                        ? `+ Other: ${formatCurrency(p.otherDeductions)}`
                        : ''}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="inline-flex items-center gap-1">
                      <HiOutlineCreditCard className="w-3 h-3" />
                      {p.paymentMode}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pay Salary Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={selectedEmployee ? `Pay Salary - ${selectedEmployee.name}` : 'Pay Salary'}
        size="md"
      >
        {!selectedEmployee ? (
          <p className="text-sm text-gray-600">
            Please select an employee from the table to pay salary.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-purple-700 font-semibold text-xs">
                  {selectedEmployee.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {selectedEmployee.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedEmployee.designation} • {selectedEmployee.department}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Basic: {formatCurrency(selectedEmployee.salary || 0)} •
                  {'  '}Allowances: {formatCurrency(selectedEmployee.allowances || 0)}
                </p>
                <p className="text-xs text-emerald-600">
                  Gross: {formatCurrency(
                    (selectedEmployee.salary || 0) + (selectedEmployee.allowances || 0)
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Month"
                name="month"
                value={formData.month}
                onChange={handleFormChange}
                options={[
                  { value: '1', label: 'Jan' },
                  { value: '2', label: 'Feb' },
                  { value: '3', label: 'Mar' },
                  { value: '4', label: 'Apr' },
                  { value: '5', label: 'May' },
                  { value: '6', label: 'Jun' },
                  { value: '7', label: 'Jul' },
                  { value: '8', label: 'Aug' },
                  { value: '9', label: 'Sep' },
                  { value: '10', label: 'Oct' },
                  { value: '11', label: 'Nov' },
                  { value: '12', label: 'Dec' }
                ]}
                error={errors.month}
              />
              <Input
                label="Year"
                type="number"
                name="year"
                value={formData.year}
                onChange={handleFormChange}
                min="2000"
                error={errors.year}
              />
            </div>

            <Input
              label="Payment Date"
              type="date"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleFormChange}
              error={errors.paymentDate}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Advance Deduction"
                type="number"
                name="advanceDeduction"
                value={formData.advanceDeduction}
                onChange={handleFormChange}
                placeholder="0"
                prefix="Rs."
                error={errors.advanceDeduction}
              />
              <Input
                label="Other Deductions"
                type="number"
                name="otherDeductions"
                value={formData.otherDeductions}
                onChange={handleFormChange}
                placeholder="0"
                prefix="Rs."
                error={errors.otherDeductions}
              />
            </div>

            <Select
              label="Payment Mode"
              name="paymentMode"
              value={formData.paymentMode}
              onChange={handleFormChange}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Other', label: 'Other' }
              ]}
            />

            <Input
              label="Notes (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              placeholder="Add any remarks for this payment"
            />

            {/* Net salary summary */}
            <div className="p-4 bg-emerald-50 rounded-xl text-sm">
              {(() => {
                const gross =
                  (selectedEmployee.salary || 0) + (selectedEmployee.allowances || 0);
                const advDed = parseFloat(formData.advanceDeduction || '0');
                const otherDed = parseFloat(formData.otherDeductions || '0');
                const net = Math.max(0, gross - advDed - otherDed);
                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-700">
                        Gross: <span className="font-semibold">{formatCurrency(gross)}</span>
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Deductions: {formatCurrency(advDed + otherDed)} (Advance:{' '}
                        {formatCurrency(advDed)}, Other:{' '}
                        {formatCurrency(otherDed)})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-600 font-medium">Net Salary</p>
                      <p className="text-lg font-bold text-emerald-700">
                        {formatCurrency(net)}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} icon={HiOutlineCash}>
                Pay Salary
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeSalary;

