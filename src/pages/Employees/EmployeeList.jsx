import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineKey,
  HiOutlineLogout,
  HiOutlineRefresh
} from 'react-icons/hi';
import { employeeAPI } from '../../services/api';
import { formatCurrency, filterBySearch } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  Badge,
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  Modal,
  ConfirmDialog,
  Input,
  Select,
  Textarea,
  PageLoader
} from '../../components/common';

const SEPARATION_STATUSES = ['Resigned', 'Terminated', 'Retired', 'Inactive'];

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, employee: null });
  const [deleting, setDeleting] = useState(false);
  const [resetModal, setResetModal] = useState({ open: false, employee: null });
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetForm, setResetForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [resetErrors, setResetErrors] = useState({});
  const [separateModal, setSeparateModal] = useState({ open: false, employee: null });
  const [separateSubmitting, setSeparateSubmitting] = useState(false);
  const [separateForm, setSeparateForm] = useState({
    status: 'Resigned',
    dateOfLeaving: new Date().toISOString().split('T')[0],
    leavingReason: '',
    writeOffAdvance: false
  });
  const [separateErrors, setSeparateErrors] = useState({});
  const [reactivateDialog, setReactivateDialog] = useState({ open: false, employee: null });
  const [reactivateSubmitting, setReactivateSubmitting] = useState(false);

  // Helper to get id from item (supports both _id and id)
  const getId = (item) => item?._id ?? item?.id;

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      if (response.success) {
        setEmployees(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.employee) return;
    const employeeId = getId(deleteModal.employee);
    setDeleting(true);
    try {
      await employeeAPI.delete(employeeId);
      toast.success('Employee deleted successfully');
      setEmployees(prev => prev.filter(e => getId(e) !== employeeId));
      setDeleteModal({ open: false, employee: null });
    } catch (error) {
      toast.error(error.message || 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const openResetModal = (employee) => {
    setResetModal({ open: true, employee });
    setResetForm({ newPassword: '', confirmPassword: '' });
    setResetErrors({});
  };

  const closeResetModal = () => {
    setResetModal({ open: false, employee: null });
    setResetForm({ newPassword: '', confirmPassword: '' });
    setResetErrors({});
  };

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetForm((prev) => ({ ...prev, [name]: value }));
    if (resetErrors[name]) {
      setResetErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ── Separation flow ──────────────────────────────────────────────────────
  const openSeparateModal = (employee) => {
    setSeparateModal({ open: true, employee });
    setSeparateForm({
      status: 'Resigned',
      dateOfLeaving: new Date().toISOString().split('T')[0],
      leavingReason: '',
      writeOffAdvance: false
    });
    setSeparateErrors({});
  };

  const closeSeparateModal = () => {
    setSeparateModal({ open: false, employee: null });
    setSeparateErrors({});
  };

  const handleSeparateChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSeparateForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (separateErrors[name]) {
      setSeparateErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSeparateSubmit = async (e) => {
    e.preventDefault();
    if (!separateModal.employee) return;

    const errors = {};
    if (!SEPARATION_STATUSES.includes(separateForm.status)) {
      errors.status = 'Select a separation type';
    }
    if (!separateForm.dateOfLeaving) {
      errors.dateOfLeaving = 'Date of leaving is required';
    } else if (new Date(separateForm.dateOfLeaving) > new Date()) {
      errors.dateOfLeaving = 'Date cannot be in the future';
    }
    setSeparateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const employeeId = getId(separateModal.employee);
    setSeparateSubmitting(true);
    try {
      const response = await employeeAPI.separate(employeeId, separateForm);
      if (response.success && response.data) {
        const updated = response.data;
        setEmployees((prev) =>
          prev.map((e) => (getId(e) === employeeId ? { ...e, ...updated } : e))
        );
        toast.success(`Marked as ${updated.status}`);
        closeSeparateModal();
      } else {
        toast.success('Employee separated');
        await fetchEmployees();
        closeSeparateModal();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to separate employee');
    } finally {
      setSeparateSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateDialog.employee) return;
    const employeeId = getId(reactivateDialog.employee);
    setReactivateSubmitting(true);
    try {
      const response = await employeeAPI.reactivate(employeeId);
      if (response.success && response.data) {
        const updated = response.data;
        setEmployees((prev) =>
          prev.map((e) => (getId(e) === employeeId ? { ...e, ...updated } : e))
        );
      } else {
        await fetchEmployees();
      }
      toast.success('Employee reactivated');
      setReactivateDialog({ open: false, employee: null });
    } catch (error) {
      toast.error(error.message || 'Failed to reactivate employee');
    } finally {
      setReactivateSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetModal.employee) return;

    const errors = {};
    if (!resetForm.newPassword || resetForm.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    if (resetForm.confirmPassword !== resetForm.newPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setResetErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const employeeId = getId(resetModal.employee);
    setResetSubmitting(true);
    try {
      await employeeAPI.resetPassword(employeeId, resetForm.newPassword);
      toast.success('Employee password reset successfully');
      closeResetModal();
    } catch (error) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Calculate totals
  const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0) + (e.allowances || 0), 0);
  const totalAdvance = employees.reduce((sum, e) => sum + (e.advanceBalance || 0), 0);

  const filteredEmployees = filterBySearch(employees, search, ['name', 'designation', 'department', 'phone']);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} employees registered`}
        breadcrumbs={[{ label: 'Employees' }]}
        action={
          <div className="flex gap-2">
            <Link to="/dashboard/employees/users">
              <Button variant="outline">User Management</Button>
            </Link>
            <Link to="/dashboard/employees/salaries">
              <Button variant="outline">Salaries</Button>
            </Link>
            <Link to="/dashboard/employees/advances">
              <Button variant="outline">Advances</Button>
            </Link>
            <Link to="/dashboard/employees/add">
              <Button icon={HiOutlinePlus}>Add Employee</Button>
            </Link>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600">
          <div className="text-white">
            <p className="text-purple-100 text-sm">Total Employees</p>
            <p className="text-2xl font-bold mt-1">{employees.length}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div className="text-white">
            <p className="text-emerald-100 text-sm">Monthly Payroll</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalSalary)}</p>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="text-white">
            <p className="text-orange-100 text-sm">Pending Advances</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalAdvance)}</p>
          </div>
        </Card>
      </div>

      <Card>
        {/* Search */}
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, designation, department, or phone..."
          />
        </div>

        {/* Table */}
        <Table>
          <TableHead>
            <TableHeader>Employee</TableHeader>
            <TableHeader>Contact</TableHeader>
            <TableHeader>Department</TableHeader>
            <TableHeader>Designation</TableHeader>
            <TableHeader>Salary</TableHeader>
            <TableHeader>Advance</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader className="text-right">Actions</TableHeader>
          </TableHead>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableEmpty
                message={search 
                  ? "No employees match your search" 
                  : "No employees registered yet"
                }
                colSpan={8}
              />
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={getId(employee)}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-sm">
                          {employee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.cnic}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <HiOutlinePhone className="w-4 h-4 mr-1" />
                        {employee.phone}
                      </div>
                      {employee.email && (
                        <div className="flex items-center text-sm text-gray-500">
                          <HiOutlineMail className="w-4 h-4 mr-1" />
                          {employee.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-700">{employee.department}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-700">{employee.designation}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{formatCurrency(employee.salary)}</p>
                      {employee.allowances > 0 && (
                        <p className="text-xs text-green-600">+{formatCurrency(employee.allowances)} allowance</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${employee.advanceBalance > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                      {formatCurrency(employee.advanceBalance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={
                          employee.status === 'Active'
                            ? 'success'
                            : employee.status === 'Terminated'
                              ? 'danger'
                              : 'default'
                        }
                      >
                        {employee.status}
                      </Badge>
                      {employee.status !== 'Active' && employee.dateOfLeaving && (
                        <span className="text-xs text-gray-500">
                          since {new Date(employee.dateOfLeaving).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/dashboard/employees/${employee.id}`)}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="View"
                      >
                        <HiOutlineEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/dashboard/employees/${getId(employee)}/edit`)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <HiOutlinePencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openResetModal(employee)}
                        className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <HiOutlineKey className="w-5 h-5" />
                      </button>
                      {employee.status === 'Active' ? (
                        <button
                          onClick={() => openSeparateModal(employee)}
                          className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Resign / Terminate"
                        >
                          <HiOutlineLogout className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setReactivateDialog({ open: true, employee })}
                          className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Reactivate"
                        >
                          <HiOutlineRefresh className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteModal({ open: true, employee })}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <HiOutlineTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {filteredEmployees.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        )}
      </Card>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, employee: null })}
        onConfirm={handleDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete "${deleteModal.employee?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />

      {/* Separation Modal */}
      <Modal
        isOpen={separateModal.open}
        onClose={closeSeparateModal}
        title={
          separateModal.employee
            ? `Separate Employee - ${separateModal.employee.name}`
            : 'Separate Employee'
        }
        size="md"
      >
        {separateModal.employee && (
          <form onSubmit={handleSeparateSubmit} className="space-y-4">
            <Select
              label="Separation Type *"
              name="status"
              value={separateForm.status}
              onChange={handleSeparateChange}
              error={separateErrors.status}
              required
            >
              <option value="Resigned">Resigned (voluntary)</option>
              <option value="Terminated">Terminated (dismissed)</option>
              <option value="Retired">Retired</option>
              <option value="Inactive">Inactive (on leave / paused)</option>
            </Select>

            <Input
              label="Date of Leaving *"
              type="date"
              name="dateOfLeaving"
              value={separateForm.dateOfLeaving}
              onChange={handleSeparateChange}
              error={separateErrors.dateOfLeaving}
              max={new Date().toISOString().split('T')[0]}
              required
            />

            <Textarea
              label="Reason"
              name="leavingReason"
              value={separateForm.leavingReason}
              onChange={handleSeparateChange}
              placeholder="e.g. Found a better opportunity / Policy violation / Reached retirement age..."
              rows={3}
            />

            {separateModal.employee.advanceBalance > 0 && (
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-sm text-orange-800 font-medium">
                  Outstanding advance: {formatCurrency(separateModal.employee.advanceBalance)}
                </p>
                <label className="flex items-start gap-2 mt-2 text-sm text-orange-900 cursor-pointer">
                  <input
                    type="checkbox"
                    name="writeOffAdvance"
                    checked={separateForm.writeOffAdvance}
                    onChange={handleSeparateChange}
                    className="mt-0.5"
                  />
                  <span>
                    Write off the outstanding advance as a loss. The amount will be
                    posted to capital.loss and the employee balance set to zero.
                  </span>
                </label>
              </div>
            )}

            <p className="text-xs text-gray-500">
              The employee's linked login account (if any) will be deactivated.
              You can reactivate later from this page.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeSeparateModal}
                disabled={separateSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" loading={separateSubmitting}>
                Confirm Separation
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reactivate confirmation */}
      <ConfirmDialog
        isOpen={reactivateDialog.open}
        onClose={() => setReactivateDialog({ open: false, employee: null })}
        onConfirm={handleReactivate}
        title="Reactivate Employee"
        message={
          reactivateDialog.employee
            ? `Bring ${reactivateDialog.employee.name} back to Active? Status, dateOfLeaving and reason will be cleared. The linked login account is not auto-reactivated — do that from User Management.`
            : ''
        }
        confirmText="Reactivate"
        loading={reactivateSubmitting}
      />

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetModal.open}
        onClose={closeResetModal}
        title={
          resetModal.employee
            ? `Reset Password - ${resetModal.employee.name}`
            : 'Reset Password'
        }
        size="sm"
      >
        {!resetModal.employee ? (
          <p className="text-sm text-gray-600">
            Select an employee to reset their password.
          </p>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              name="newPassword"
              value={resetForm.newPassword}
              onChange={handleResetChange}
              error={resetErrors.newPassword}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={resetForm.confirmPassword}
              onChange={handleResetChange}
              error={resetErrors.confirmPassword}
              required
            />
            <p className="text-xs text-gray-500">
              The employee will be required to use this new password the next time they log in.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeResetModal}
                disabled={resetSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={resetSubmitting}>
                Reset Password
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeList;
