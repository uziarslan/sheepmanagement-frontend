import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { employeeAPI } from '../../services/mockApi';
import { formatCurrency } from '../../utils/helpers';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Textarea
} from '../../components/common';
import { PageLoader } from '../../components/common/Spinner';
import { departments, designations, banks } from '../../data/mockData';

const EmployeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    name: '',
    cnic: '',
    phone: '',
    email: '',
    address: '',
    designation: '',
    department: '',
    dateOfJoining: '',
    salary: '',
    allowances: '',
    bankName: '',
    accountNumber: '',
    emergencyContact: { name: '', phone: '', relation: '' },
    notes: '',
    createCredentials: false,
    loginPassword: ''
  });

  useEffect(() => {
    if (isEdit) {
      fetchEmployee();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const response = await employeeAPI.getById(id);
      if (response.success) {
        const employee = response.data;
        const ec = employee.emergencyContact && typeof employee.emergencyContact === 'object'
          ? employee.emergencyContact
          : {};
        setFormData({
          ...employee,
          dateOfJoining: employee.dateOfJoining?.split('T')[0] || '',
          emergencyContact: {
            name: ec.name || '',
            phone: ec.phone || '',
            relation: ec.relation || ''
          },
          createCredentials: false,
          loginPassword: ''
        });
      }
    } catch (error) {
      toast.error('Employee not found');
      navigate('/dashboard/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [field]: fieldValue }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: fieldValue }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }
    if (!formData.cnic.trim()) {
      newErrors.cnic = 'CNIC is required';
    } else if (!/^\d{5}-\d{7}-\d{1}$/.test(formData.cnic)) {
      newErrors.cnic = 'Please enter valid CNIC format (XXXXX-XXXXXXX-X)';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.designation) {
      newErrors.designation = 'Designation is required';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    if (!formData.salary || parseFloat(formData.salary) <= 0) {
      newErrors.salary = 'Please enter a valid salary';
    }
    if (!formData.dateOfJoining) {
      newErrors.dateOfJoining = 'Date of joining is required';
    }

    if (!isEdit && formData.createCredentials) {
      if (!formData.email || !formData.email.trim()) {
        newErrors.email = 'Email is required to create login credentials';
      }
      if (!formData.loginPassword || formData.loginPassword.length < 6) {
        newErrors.loginPassword = 'Temporary password must be at least 6 characters';
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
      const emergencyContact = formData.emergencyContact && typeof formData.emergencyContact === 'object'
        ? {
            name: (formData.emergencyContact.name || '').trim() || null,
            phone: (formData.emergencyContact.phone || '').trim() || null,
            relation: (formData.emergencyContact.relation || '').trim() || null
          }
        : null;

      let dataToSubmit;
      if (isEdit) {
        // Only send fields the backend update accepts (exclude advanceBalance, picture, createdBy, documents, createdAt, updatedAt, totalCompensation, tenureMonths, id)
        dataToSubmit = {
          name: formData.name?.trim(),
          cnic: formData.cnic?.trim(),
          phone: formData.phone?.trim(),
          email: (formData.email || '').trim() || null,
          address: (formData.address || '').trim() || null,
          designation: formData.designation,
          department: formData.department,
          dateOfJoining: formData.dateOfJoining,
          dateOfLeaving: formData.dateOfLeaving || null,
          salary: parseFloat(formData.salary),
          allowances: parseFloat(formData.allowances) || 0,
          bankName: formData.bankName || null,
          accountNumber: (formData.accountNumber || '').trim() || null,
          status: formData.status,
          emergencyContact,
          notes: (formData.notes || '').trim() || null
        };
        await employeeAPI.update(id, dataToSubmit);
        toast.success('Employee updated successfully');
      } else {
        dataToSubmit = {
          name: formData.name?.trim(),
          cnic: formData.cnic?.trim(),
          phone: formData.phone?.trim(),
          email: (formData.email || '').trim() || null,
          address: (formData.address || '').trim() || null,
          designation: formData.designation,
          department: formData.department,
          dateOfJoining: formData.dateOfJoining,
          salary: parseFloat(formData.salary),
          allowances: parseFloat(formData.allowances) || 0,
          bankName: formData.bankName || null,
          accountNumber: (formData.accountNumber || '').trim() || null,
          emergencyContact,
          notes: (formData.notes || '').trim() || null
        };
        if (formData.createCredentials) {
          dataToSubmit.createCredentials = true;
          dataToSubmit.loginPassword = formData.loginPassword;
        }
        await employeeAPI.create(dataToSubmit);
        toast.success('Employee added successfully');
      }
      navigate('/dashboard/employees');
    } catch (error) {
      toast.error(error.message || 'Failed to save employee');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate gross salary
  const grossSalary = (parseFloat(formData.salary) || 0) + (parseFloat(formData.allowances) || 0);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit Employee' : 'Add New Employee'}
        subtitle={isEdit ? `Editing ${formData.name}` : 'Register a new employee'}
        breadcrumbs={[
          { label: 'Employees', path: '/dashboard/employees' },
          { label: isEdit ? 'Edit' : 'Add New' }
        ]}
        action={
          <Button
            variant="ghost"
            icon={HiOutlineArrowLeft}
            onClick={() => navigate('/dashboard/employees')}
          >
            Back to List
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Personal Information</h3>
            
            <div className="space-y-4">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Muhammad Ali"
                error={errors.name}
                required
              />

              <Input
                label="CNIC"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                placeholder="XXXXX-XXXXXXX-X"
                error={errors.cnic}
                required
              />

              <Input
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="03XX-XXXXXXX"
                error={errors.phone}
                required
              />

              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                error={errors.email}
              />

              {!isEdit && (
                <div className="space-y-3 p-3 border border-emerald-100 rounded-lg bg-emerald-50/40">
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="createCredentials"
                      checked={formData.createCredentials}
                      onChange={handleChange}
                      className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span>Create login credentials for this employee</span>
                  </label>
                  <p className="text-xs text-gray-500">
                    If enabled, the employee will be able to log in using the email above and the temporary password you set.
                  </p>
                  {formData.createCredentials && (
                    <Input
                      label="Temporary Password"
                      type="password"
                      name="loginPassword"
                      value={formData.loginPassword}
                      onChange={handleChange}
                      placeholder="Enter a temporary password"
                      error={errors.loginPassword}
                      required
                    />
                  )}
                </div>
              )}

              <Textarea
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter complete address"
                rows={3}
              />

              <Input
                label="Emergency Contact Name"
                name="emergencyContact.name"
                value={formData.emergencyContact?.name ?? ''}
                onChange={handleChange}
                placeholder="Contact person name"
              />
              <Input
                label="Emergency Contact Phone"
                name="emergencyContact.phone"
                value={formData.emergencyContact?.phone ?? ''}
                onChange={handleChange}
                placeholder="03XX-XXXXXXX"
              />
              <Input
                label="Emergency Contact Relation"
                name="emergencyContact.relation"
                value={formData.emergencyContact?.relation ?? ''}
                onChange={handleChange}
                placeholder="e.g., Spouse, Parent"
              />
            </div>
          </Card>

          {/* Employment Details */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Employment Details</h3>
            
            <div className="space-y-4">
              <Select
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                options={departments}
                placeholder="Select department"
                error={errors.department}
                required
              />

              <Select
                label="Designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                options={designations}
                placeholder="Select designation"
                error={errors.designation}
                required
              />

              <Input
                label="Date of Joining"
                type="date"
                name="dateOfJoining"
                value={formData.dateOfJoining}
                onChange={handleChange}
                error={errors.dateOfJoining}
                required
              />
            </div>
          </Card>

          {/* Salary & Bank Details */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Salary & Bank Details</h3>
            
            <div className="space-y-4">
              <Input
                label="Basic Salary"
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                placeholder="Enter basic salary"
                prefix="Rs."
                error={errors.salary}
                required
              />

              <Input
                label="Allowances"
                type="number"
                name="allowances"
                value={formData.allowances}
                onChange={handleChange}
                placeholder="Enter allowances"
                prefix="Rs."
              />

              {/* Gross Salary Display */}
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-sm text-emerald-600 mb-1">Gross Salary (Monthly)</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(grossSalary)}
                </p>
              </div>

              <Select
                label="Bank Name"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                options={banks}
                placeholder="Select bank"
              />

              <Input
                label="Account Number"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Enter account number"
              />
            </div>
          </Card>

          {/* Additional Notes */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Additional Notes</h3>
            <Textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter any additional notes about the employee..."
              rows={5}
            />

            {/* Info Box */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Note</h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Employee will be marked as Active by default</li>
                <li>• Advance balance will start at Rs. 0</li>
                <li>• You can manage attendance and salary separately</li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard/employees')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
          >
            {isEdit ? 'Update Employee' : 'Add Employee'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
