import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineMinus,
  HiOutlineCalendar,
  HiOutlineCash,
  HiOutlineDocumentText
} from 'react-icons/hi';
import { employeeAPI, advanceAPI } from '../../services/mockApi';
import { formatCurrency, formatDate } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
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

const EmployeeAdvance = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('give'); // 'give' or 'return'
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Selected employee for viewing history
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [employeesRes, advancesRes] = await Promise.all([
        employeeAPI.getAll(),
        advanceAPI.getAll()
      ]);
      if (employeesRes.success) setEmployees(employeesRes.data);
      if (advancesRes.success) setAdvances(advancesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, employee = null) => {
    setModalType(type);
    setFormData({
      employeeId: employee?._id || employee?.id || '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({
      employeeId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setErrors({});
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
    
    if (!formData.employeeId) {
      newErrors.employeeId = 'Please select an employee';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    // For return type, check if amount exceeds balance
    if (modalType === 'return') {
      const employee = employees.find(e => e.id === parseInt(formData.employeeId));
      if (employee && parseFloat(formData.amount) > employee.advanceBalance) {
        newErrors.amount = `Amount cannot exceed balance (${formatCurrency(employee.advanceBalance)})`;
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
      const advanceData = {
        employee: String(formData.employeeId),
        amount: parseFloat(formData.amount),
        type: modalType === 'give' ? 'Given' : 'Returned',
        date: formData.date,
        notes: formData.notes
      };

      const response = await advanceAPI.create(advanceData);
      
      if (response.success) {
        toast.success(`Advance ${modalType === 'give' ? 'given' : 'returned'} successfully`);
        
        // Update employee balance in local state
        const employeeIdKey = formData.employeeId;
        setEmployees(prev => prev.map(emp => {
          if ((emp._id || emp.id) == employeeIdKey) {
            const newBalance = modalType === 'give'
              ? (emp.advanceBalance || 0) + advanceData.amount
              : (emp.advanceBalance || 0) - advanceData.amount;
            return { ...emp, advanceBalance: newBalance };
          }
          return emp;
        }));
        
        // Add to advances list
        setAdvances(prev => [response.data, ...prev]);
        
        closeModal();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to process advance');
    } finally {
      setSubmitting(false);
    }
  };

  const getEmployeeById = (id) => {
    if (id == null || id === '') return null;
    return employees.find(e => (e._id || e.id) == id);
  };

  // Calculate totals
  const totalAdvanceGiven = advances
    .filter(a => a.type === 'Given')
    .reduce((sum, a) => sum + a.amount, 0);
  const totalAdvanceReturned = advances
    .filter(a => a.type === 'Returned')
    .reduce((sum, a) => sum + a.amount, 0);
  const currentOutstanding = employees.reduce((sum, e) => sum + (e.advanceBalance || 0), 0);

  // Filter advances for selected employee
  const filteredAdvances = selectedEmployee 
    ? advances.filter(a => a.employeeId === selectedEmployee.id)
    : advances;

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Advances"
        subtitle="Manage employee advance loans and repayments"
        breadcrumbs={[
          { label: 'Employees', path: '/dashboard/employees' },
          { label: 'Advances' }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Given</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalAdvanceGiven)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <HiOutlinePlus className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Returned</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalAdvanceReturned)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <HiOutlineMinus className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Outstanding Balance</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(currentOutstanding)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <HiOutlineCash className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Employees with Advances</p>
                <p className="text-2xl font-bold mt-1">
                  {employees.filter(e => e.advanceBalance > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <HiOutlineDocumentText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employees with Balances */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Employee Balances</h3>
            <div className="flex gap-2">
              <Button size="sm" icon={HiOutlinePlus} onClick={() => openModal('give')}>
                Give
              </Button>
              <Button size="sm" variant="outline" icon={HiOutlineMinus} onClick={() => openModal('return')}>
                Return
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {employees.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No employees found</p>
            ) : (
              employees.map((employee) => {
                const empId = employee._id || employee.id;
                const isSelected = selectedEmployee && (selectedEmployee._id || selectedEmployee.id) === empId;
                const hasBalance = (employee.advanceBalance || 0) > 0;
                
                return (
                  <div
                    key={empId}
                    onClick={() => setSelectedEmployee(isSelected ? null : employee)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          hasBalance ? 'bg-orange-100' : 'bg-gray-100'
                        }`}>
                          <span className={`font-semibold text-sm ${
                            hasBalance ? 'text-orange-600' : 'text-gray-500'
                          }`}>
                            {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{employee.name}</p>
                          <p className="text-xs text-gray-500">{employee.designation}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${hasBalance ? 'text-orange-600' : 'text-gray-400'}`}>
                          {formatCurrency(employee.advanceBalance || 0)}
                        </p>
                        {hasBalance && (
                          <Badge variant="warning" className="text-xs mt-1">Outstanding</Badge>
                        )}
                      </div>
                    </div>
                    
                    {hasBalance && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-xs"
                          icon={HiOutlinePlus}
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal('give', employee);
                          }}
                        >
                          Give More
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          icon={HiOutlineMinus}
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal('return', employee);
                          }}
                        >
                          Return
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Transaction History */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedEmployee 
                  ? `${selectedEmployee.name}'s Advance History` 
                  : 'All Transactions'
                }
              </h3>
              {selectedEmployee && (
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  View all transactions
                </button>
              )}
            </div>
            <Badge variant="default">{filteredAdvances.length} transactions</Badge>
          </div>

          <Table>
            <TableHead>
              <TableHeader>Date</TableHeader>
              <TableHeader>Employee</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Notes</TableHeader>
            </TableHead>
            <TableBody>
              {filteredAdvances.length === 0 ? (
                <TableEmpty
                  message={selectedEmployee 
                    ? "No transactions for this employee" 
                    : "No advance transactions yet"
                  }
                  colSpan={5}
                />
              ) : (
                filteredAdvances.map((advance) => {
                  const employee = getEmployeeById(advance.employee || advance.employeeId);
                  return (
                    <TableRow key={advance.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <HiOutlineCalendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{formatDate(advance.date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-600 font-medium text-xs">
                              {employee?.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{employee?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={advance.type === 'Given' ? 'warning' : 'success'}>
                          {advance.type === 'Given' ? (
                            <span className="flex items-center gap-1">
                              <HiOutlinePlus className="w-3 h-3" />
                              Given
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <HiOutlineMinus className="w-3 h-3" />
                              Returned
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          advance.type === 'Given' ? 'text-orange-600' : 'text-emerald-600'
                        }`}>
                          {advance.type === 'Given' ? '+' : '-'}{formatCurrency(advance.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">{advance.notes || '-'}</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Give/Return Advance Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalType === 'give' ? 'Give Advance' : 'Return Advance'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Select Employee"
            name="employeeId"
            value={formData.employeeId}
            onChange={handleChange}
            options={employees
              .filter(e => modalType === 'give' || (e.advanceBalance || 0) > 0)
              .map(e => ({
                value: e._id || e.id,
                label: `${e.name} (Balance: ${formatCurrency(e.advanceBalance || 0)})`
              }))
            }
            placeholder="Choose an employee"
            error={errors.employeeId}
            required
          />
          
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
          
          <Input
            label="Date"
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            error={errors.date}
            required
          />
          
          <Textarea
            label="Notes (Optional)"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any notes..."
            rows={3}
          />

          {formData.employeeId && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">
                Current Balance: <span className="font-semibold text-gray-900">
                  {formatCurrency(getEmployeeById(formData.employeeId)?.advanceBalance || 0)}
                </span>
              </p>
              {formData.amount && (
                <p className="text-sm text-gray-600 mt-1">
                  New Balance: <span className={`font-semibold ${
                    modalType === 'give' ? 'text-orange-600' : 'text-emerald-600'
                  }`}>
                    {formatCurrency(
                      (getEmployeeById(formData.employeeId)?.advanceBalance || 0) +
                      (modalType === 'give' ? parseFloat(formData.amount) || 0 : -(parseFloat(formData.amount) || 0))
                    )}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              variant={modalType === 'give' ? 'primary' : 'primary'}
              icon={modalType === 'give' ? HiOutlinePlus : HiOutlineMinus}
            >
              {modalType === 'give' ? 'Give Advance' : 'Return Advance'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeAdvance;
