import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { HiOutlineUserGroup, HiOutlineUserAdd, HiOutlineShieldCheck, HiOutlineKey } from 'react-icons/hi';
import { employeeAPI, userAPI } from '../../services/api';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  PageLoader,
  Modal,
  Badge
} from '../../components/common';

const UserManagement = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [mode, setMode] = useState('admin'); // 'admin' | 'employee'

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [employeeForm, setEmployeeForm] = useState({
    employeeId: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const [passwordModal, setPasswordModal] = useState({
    open: false,
    user: null,
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await employeeAPI.getAll({ limit: 100 });
        if (res && res.success && Array.isArray(res.data)) {
          setEmployees(res.data.filter((e) => e.status === 'Active'));
        } else if (Array.isArray(res)) {
          setEmployees(res);
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await userAPI.getAll();
      if (res?.success && Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load users');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e._id || e.id,
        label: `${e.name} (${e.designation || 'Employee'})`
      })),
    [employees]
  );

  const selectedEmployee = useMemo(
    () => employees.find((e) => String(e._id || e.id) === String(employeeForm.employeeId)),
    [employees, employeeForm.employeeId]
  );

  useEffect(() => {
    if (selectedEmployee) {
      setEmployeeForm((prev) => ({
        ...prev,
        email: selectedEmployee.email || ''
      }));
    }
  }, [selectedEmployee]);

  const handleAdminChange = (e) => {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleEmployeeChange = (e) => {
    const { name, value } = e.target;
    setEmployeeForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateAdmin = () => {
    const newErrors = {};
    if (!adminForm.name.trim()) newErrors.name = 'Name is required';
    if (!adminForm.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(adminForm.email)) newErrors.email = 'Invalid email';
    if (!adminForm.password || adminForm.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEmployee = () => {
    const newErrors = {};
    if (!employeeForm.employeeId) newErrors.employeeId = 'Employee is required';
    if (!employeeForm.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(employeeForm.email)) newErrors.email = 'Invalid email';
    if (!employeeForm.password || employeeForm.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isAdminMode = mode === 'admin';

    if (isAdminMode) {
      if (!validateAdmin()) return;
    } else {
      if (!validateEmployee()) return;
    }

    setSubmitting(true);
    try {
      if (isAdminMode) {
        await userAPI.create({
          name: adminForm.name.trim(),
          email: adminForm.email.trim(),
          phone: adminForm.phone?.trim() || undefined,
          password: adminForm.password,
          role: 'Admin'
        });
        toast.success('Admin user created successfully');
        setAdminForm({ name: '', email: '', phone: '', password: '' });
      } else {
        await userAPI.create({
          name: selectedEmployee?.name || 'Employee User',
          email: employeeForm.email.trim(),
          password: employeeForm.password,
          role: 'Employee',
          phone: selectedEmployee?.phone || undefined,
          employeeId: employeeForm.employeeId
        });
        toast.success('Employee login created successfully');
        setEmployeeForm({ employeeId: '', email: '', password: '' });
      }
      setErrors({});
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const openPasswordModal = (user) => {
    setPasswordModal({
      open: true,
      user,
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordErrors({});
  };

  const closePasswordModal = () => {
    setPasswordModal({ open: false, user: null, newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
  };

  const handlePasswordModalChange = (e) => {
    const { name, value } = e.target;
    setPasswordModal((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validatePasswordForm = () => {
    const err = {};
    if (!passwordModal.newPassword || passwordModal.newPassword.length < 6) {
      err.newPassword = 'Password must be at least 6 characters';
    }
    if (passwordModal.newPassword !== passwordModal.confirmPassword) {
      err.confirmPassword = 'Passwords do not match';
    }
    setPasswordErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordModal.user) return;
    if (!validatePasswordForm()) return;
    setSubmitting(true);
    try {
      await userAPI.resetPassword(passwordModal.user._id || passwordModal.user.id, {
        newPassword: passwordModal.newPassword,
        confirmPassword: passwordModal.confirmPassword
      });
      toast.success('Password changed successfully');
      closePasswordModal();
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Create admin accounts and employee login credentials"
        breadcrumbs={[
          { label: 'Employees', path: '/dashboard/employees' },
          { label: 'User Management' }
        ]}
        action={
          <div className="inline-flex rounded-lg bg-emerald-50 p-1">
            <button
              type="button"
              onClick={() => setMode('admin')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 ${
                mode === 'admin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <HiOutlineShieldCheck className="w-3 h-3" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setMode('employee')}
              className={`ml-1 px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1 ${
                mode === 'employee'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <HiOutlineUserGroup className="w-3 h-3" />
              Employee Login
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {mode === 'admin' ? 'Create Admin User' : 'Create Employee Login'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'admin'
              ? 'Admins have full access to all modules and can manage other users.'
              : 'Create login credentials for an existing employee so they can access the system.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'admin' ? (
              <>
                <Input
                  label="Full Name"
                  name="name"
                  value={adminForm.name}
                  onChange={handleAdminChange}
                  placeholder="Admin Name"
                  error={errors.name}
                  required
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={adminForm.email}
                  onChange={handleAdminChange}
                  placeholder="admin@sheepfarm.pk"
                  error={errors.email}
                  required
                />
                <Input
                  label="Phone (optional)"
                  name="phone"
                  value={adminForm.phone}
                  onChange={handleAdminChange}
                  placeholder="0300-1234567"
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={adminForm.password}
                  onChange={handleAdminChange}
                  placeholder="Minimum 6 characters"
                  error={errors.password}
                  required
                />
              </>
            ) : (
              <>
                <Select
                  label="Employee"
                  name="employeeId"
                  value={employeeForm.employeeId}
                  onChange={handleEmployeeChange}
                  options={employeeOptions}
                  placeholder="Select an employee"
                  error={errors.employeeId}
                  required
                />
                <Input
                  label="Login Email"
                  name="email"
                  type="email"
                  value={employeeForm.email}
                  onChange={handleEmployeeChange}
                  placeholder="employee@sheepfarm.pk"
                  error={errors.email}
                  required
                />
                <Input
                  label="Temporary Password"
                  name="password"
                  type="password"
                  value={employeeForm.password}
                  onChange={handleEmployeeChange}
                  placeholder="Minimum 6 characters"
                  error={errors.password}
                  required
                />
              </>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button type="submit" loading={submitting} icon={HiOutlineUserAdd}>
                {mode === 'admin' ? 'Create Admin' : 'Create Employee Login'}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Guidelines</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Only Admins can access this page and create users.</li>
            <li>• Admin accounts have full control over the system.</li>
            <li>• Employee logins are linked to existing employee records.</li>
            <li>• Share temporary passwords securely and ask users to change them after first login.</li>
          </ul>
        </Card>
      </div>

      {/* Existing logins – Change password */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Existing logins</h3>
        <p className="text-sm text-gray-500 mb-4">Change password for any user (Admin or Employee).</p>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No users with login yet. Create an Admin or Employee login above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Role</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">Employee</th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id || u.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-900">{u.name}</td>
                    <td className="py-3 px-2 text-gray-600">{u.email}</td>
                    <td className="py-3 px-2">
                      <Badge variant={u.role === 'Admin' ? 'info' : 'purple'}>{u.role}</Badge>
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {u.employee?.name ? `${u.employee.name}${u.employee.designation ? ` (${u.employee.designation})` : ''}` : '—'}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={HiOutlineKey}
                        onClick={() => openPasswordModal(u)}
                      >
                        Change password
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={passwordModal.open}
        onClose={closePasswordModal}
        title="Change password"
        size="md"
      >
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
          {passwordModal.user && (
            <p className="text-sm text-gray-600">
              Setting a new password for <strong>{passwordModal.user.name}</strong> ({passwordModal.user.email}).
            </p>
          )}
          <Input
            label="New password"
            type="password"
            name="newPassword"
            value={passwordModal.newPassword}
            onChange={handlePasswordModalChange}
            placeholder="At least 6 characters"
            error={passwordErrors.newPassword}
            required
          />
          <Input
            label="Confirm password"
            type="password"
            name="confirmPassword"
            value={passwordModal.confirmPassword}
            onChange={handlePasswordModalChange}
            placeholder="Re-enter new password"
            error={passwordErrors.confirmPassword}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={closePasswordModal}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Update password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;

