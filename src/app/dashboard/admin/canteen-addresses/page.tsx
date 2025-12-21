'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CanteenAddress {
  id: string;
  canteen_name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_pincode: string | null;
  contact_person: string;
  mobile_number: string;
  gst_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminCanteenAddressesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState<CanteenAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CanteenAddress | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form data with enhanced structure
  const [formData, setFormData] = useState({
    // Basic Information
    canteenName: '',
    
    // Billing Information
    billingAddress: '',
    billingCity: '',
    billingState: 'Tamil Nadu',
    billingPincode: '',
    billingGstNumber: '',
    billingContactPerson: '',
    billingMobile: '',
    billingEmail: '',
    
    // Delivery Information
    deliveryAddress: '',
    deliveryCity: '',
    deliveryState: 'Tamil Nadu',
    deliveryPincode: '',
    receivingPersonName: '',
    receivingPersonMobile: '',
    receivingPersonEmail: '',
    receivingPersonDesignation: '',
    
    // Status
    isActive: true
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'retail_staff'].includes(session.user?.role || '')) {
      router.push('/dashboard');
      return;
    }
    
    fetchAddresses();
  }, [session, status, router]);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/canteen-addresses');
      const data = await response.json();
      
      if (response.ok) {
        setAddresses(data.addresses);
      } else {
        setError(data.error || 'Failed to fetch canteen addresses');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const openAddModal = () => {
    setFormData({
      // Basic Information
      canteenName: '',
      
      // Billing Information
      billingAddress: '',
      billingCity: '',
      billingState: 'Tamil Nadu',
      billingPincode: '',
      billingGstNumber: '',
      billingContactPerson: '',
      billingMobile: '',
      billingEmail: '',
      
      // Delivery Information
      deliveryAddress: '',
      deliveryCity: '',
      deliveryState: 'Tamil Nadu',
      deliveryPincode: '',
      receivingPersonName: '',
      receivingPersonMobile: '',
      receivingPersonEmail: '',
      receivingPersonDesignation: '',
      
      // Status
      isActive: true
    });
    setShowAddModal(true);
    setError('');
    setSuccess('');
  };

  const openEditModal = (address: CanteenAddress) => {
    setSelectedAddress(address);
    setFormData({
      // Basic Information
      canteenName: address.canteen_name,
      
      // Billing Information (map from existing fields)
      billingAddress: address.billing_address || '',
      billingCity: address.billing_city || '',
      billingState: address.billing_state || 'Tamil Nadu',
      billingPincode: address.billing_pincode || '',
      billingGstNumber: address.gst_number || '',
      billingContactPerson: address.contact_person, // Map existing contact to billing
      billingMobile: address.mobile_number, // Map existing mobile to billing
      billingEmail: '', // New field, will be empty for existing records
      
      // Delivery Information (map from existing delivery fields)
      deliveryAddress: address.address,
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryPincode: address.pincode,
      receivingPersonName: address.contact_person, // Map existing contact to receiving person
      receivingPersonMobile: address.mobile_number, // Map existing mobile to receiving person
      receivingPersonEmail: '', // New field, will be empty for existing records
      receivingPersonDesignation: '', // New field, will be empty for existing records
      
      // Status
      isActive: address.is_active
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedAddress(null);
    setError('');
    setSuccess('');
  };

  const handleCreate = async () => {
    // Validate required fields as per user requirements
    if (!formData.canteenName.trim()) {
      setError('Canteen name is required.');
      return;
    }
    if (!formData.deliveryAddress.trim()) {
      setError('Address is required.');
      return;
    }
    if (!formData.deliveryCity.trim()) {
      setError('City is required.');
      return;
    }
    if (!formData.deliveryPincode.trim()) {
      setError('Pincode is required.');
      return;
    }
    if (!formData.receivingPersonName.trim()) {
      setError('Contact person is required.');
      return;
    }
    if (!formData.receivingPersonMobile.trim()) {
      setError('Mobile number is required.');
      return;
    }

    // Validate mobile number format
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.receivingPersonMobile.replace(/\s/g, ''))) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Validate pincode format
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(formData.deliveryPincode.replace(/\s/g, ''))) {
      setError('Please enter a valid 6-digit pincode.');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      
      const response = await fetch('/api/admin/canteen-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Canteen address created successfully');
        closeModals();
        fetchAddresses();
      } else {
        setError(data.error || 'Failed to create canteen address');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    // Validate required fields as per user requirements
    if (!selectedAddress) {
      setError('No address selected for update.');
      return;
    }
    if (!formData.canteenName.trim()) {
      setError('Canteen name is required.');
      return;
    }
    if (!formData.deliveryAddress.trim()) {
      setError('Address is required.');
      return;
    }
    if (!formData.deliveryCity.trim()) {
      setError('City is required.');
      return;
    }
    if (!formData.deliveryPincode.trim()) {
      setError('Pincode is required.');
      return;
    }
    if (!formData.receivingPersonName.trim()) {
      setError('Contact person is required.');
      return;
    }
    if (!formData.receivingPersonMobile.trim()) {
      setError('Mobile number is required.');
      return;
    }

    // Validate mobile number format
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.receivingPersonMobile.replace(/\s/g, ''))) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Validate pincode format
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(formData.deliveryPincode.replace(/\s/g, ''))) {
      setError('Please enter a valid 6-digit pincode.');
      return;
    }

    try {
      setIsUpdating(true);
      setError('');
      
      const response = await fetch(`/api/admin/canteen-addresses/${selectedAddress.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Canteen address updated successfully');
        closeModals();
        fetchAddresses();
      } else {
        setError(data.error || 'Failed to update canteen address');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (address: CanteenAddress) => {
    if (!confirm(`Are you sure you want to delete "${address.canteen_name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      setError('');
      
      const response = await fetch(`/api/admin/canteen-addresses/${address.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Canteen address deleted successfully');
        fetchAddresses();
      } else {
        setError(data.error || 'Failed to delete canteen address');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = (address: CanteenAddress) => {
    // Pre-fill form with existing address data for duplication
    setFormData({
      // Basic Information
      canteenName: `${address.canteen_name} (Copy)`,
      
      // Billing Information (map from existing fields)
      billingAddress: address.billing_address || address.address,
      billingCity: address.billing_city || address.city,
      billingState: address.billing_state || address.state,
      billingPincode: address.billing_pincode || address.pincode,
      billingGstNumber: address.gst_number || '',
      billingContactPerson: address.contact_person,
      billingMobile: address.mobile_number,
      billingEmail: '',
      
      // Delivery Information (map from existing delivery fields)
      deliveryAddress: address.address,
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryPincode: address.pincode,
      receivingPersonName: address.contact_person,
      receivingPersonMobile: address.mobile_number,
      receivingPersonEmail: '',
      receivingPersonDesignation: '',
      
      // Status
      isActive: true
    });
    setShowAddModal(true);
    setError('');
    setSuccess('');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !['admin', 'retail_staff'].includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Canteen Address Management</h1>
              <p className="mt-2 text-gray-600">Manage delivery addresses for canteen sales</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={openAddModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Add Canteen Address
              </button>
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name} (Admin)
              </span>
              <Link
                href="/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        {/* Addresses Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Canteen Addresses ({addresses.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Canteen Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billing Address & GST
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receiving Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {addresses.map((address) => (
                  <tr key={address.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{address.canteen_name}</div>
                        <div className="text-sm text-gray-500">{address.city}, {address.pincode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900 whitespace-pre-line">
                          {address.billing_address || address.address}
                        </div>
                        <div className="text-sm text-gray-500">
                          {address.billing_city || address.city}, {address.billing_pincode || address.pincode}
                        </div>
                        {address.gst_number && (
                          <div className="text-xs text-blue-600 font-medium">GST: {address.gst_number}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900 whitespace-pre-line">{address.address}</div>
                        <div className="text-sm text-gray-500">{address.city}, {address.pincode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{address.contact_person}</div>
                        <div className="text-sm text-gray-500">📞 {address.mobile_number}</div>
                        <div className="text-xs text-gray-500">Receiving Person</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        address.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {address.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openEditModal(address)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(address)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDelete(address)}
                        className="text-red-600 hover:text-red-900"
                        disabled={isDeleting}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-xl font-bold text-green-800 mb-6">Add New Canteen Address</h3>
                
                {/* Basic Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    📋 Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Canteen Name *
                      </label>
                      <input
                        type="text"
                        name="canteenName"
                        value={formData.canteenName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter canteen name"
                      />
                    </div>
                  </div>
                </div>

                {/* Billing Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-blue-800 mb-4 border-b border-blue-200 pb-2">
                    💼 Billing Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Address *
                      </label>
                      <textarea
                        name="billingAddress"
                        value={formData.billingAddress}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter complete billing address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing City *
                      </label>
                      <input
                        type="text"
                        name="billingCity"
                        value={formData.billingCity}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter billing city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing State
                      </label>
                      <input
                        type="text"
                        name="billingState"
                        value={formData.billingState}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter billing state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Pincode *
                      </label>
                      <input
                        type="text"
                        name="billingPincode"
                        value={formData.billingPincode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter billing pincode"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST Number
                      </label>
                      <input
                        type="text"
                        name="billingGstNumber"
                        value={formData.billingGstNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter GST number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Contact Person *
                      </label>
                      <input
                        type="text"
                        name="billingContactPerson"
                        value={formData.billingContactPerson}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter billing contact person"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Mobile *
                      </label>
                      <input
                        type="text"
                        name="billingMobile"
                        value={formData.billingMobile}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter billing mobile number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Email
                      </label>
                      <input
                        type="email"
                        name="billingEmail"
                        value={formData.billingEmail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter billing email"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-green-800 mb-4 border-b border-green-200 pb-2">
                    🚚 Delivery Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Address *
                      </label>
                      <textarea
                        name="deliveryAddress"
                        value={formData.deliveryAddress}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter complete delivery address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery City *
                      </label>
                      <input
                        type="text"
                        name="deliveryCity"
                        value={formData.deliveryCity}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter delivery city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery State
                      </label>
                      <input
                        type="text"
                        name="deliveryState"
                        value={formData.deliveryState}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter delivery state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Pincode *
                      </label>
                      <input
                        type="text"
                        name="deliveryPincode"
                        value={formData.deliveryPincode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter delivery pincode"
                      />
                    </div>
                  </div>
                </div>

                {/* Receiving Person Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-purple-800 mb-4 border-b border-purple-200 pb-2">
                    👤 Receiving Person Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receiving Person Name *
                      </label>
                      <input
                        type="text"
                        name="receivingPersonName"
                        value={formData.receivingPersonName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter receiving person name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        name="receivingPersonDesignation"
                        value={formData.receivingPersonDesignation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter designation (e.g., Manager, Supervisor)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receiving Person Mobile *
                      </label>
                      <input
                        type="text"
                        name="receivingPersonMobile"
                        value={formData.receivingPersonMobile}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter receiving person mobile"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receiving Person Email
                      </label>
                      <input
                        type="email"
                        name="receivingPersonEmail"
                        value={formData.receivingPersonEmail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter receiving person email"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={closeModals}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create Canteen Address'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedAddress && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-xl font-bold text-indigo-800 mb-6">Edit Canteen Address</h3>
                
                {/* Basic Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    📋 Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Canteen Name *
                      </label>
                      <input
                        type="text"
                        name="canteenName"
                        value={formData.canteenName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter canteen name"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-green-800 mb-4 border-b border-green-200 pb-2">
                    🚚 Delivery Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Address *
                      </label>
                      <textarea
                        name="deliveryAddress"
                        value={formData.deliveryAddress}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter complete delivery address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery City *
                      </label>
                      <input
                        type="text"
                        name="deliveryCity"
                        value={formData.deliveryCity}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter delivery city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery State
                      </label>
                      <input
                        type="text"
                        name="deliveryState"
                        value={formData.deliveryState}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter delivery state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Pincode *
                      </label>
                      <input
                        type="text"
                        name="deliveryPincode"
                        value={formData.deliveryPincode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter delivery pincode"
                      />
                    </div>
                  </div>
                </div>

                {/* Receiving Person Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-purple-800 mb-4 border-b border-purple-200 pb-2">
                    👤 Receiving Person Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receiving Person Name *
                      </label>
                      <input
                        type="text"
                        name="receivingPersonName"
                        value={formData.receivingPersonName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter receiving person name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Designation
                      </label>
                      <input
                        type="text"
                        name="receivingPersonDesignation"
                        value={formData.receivingPersonDesignation}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter designation (e.g., Manager, Supervisor)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receiving Person Mobile *
                      </label>
                      <input
                        type="text"
                        name="receivingPersonMobile"
                        value={formData.receivingPersonMobile}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter receiving person mobile"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receiving Person Email
                      </label>
                      <input
                        type="email"
                        name="receivingPersonEmail"
                        value={formData.receivingPersonEmail}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter receiving person email"
                      />
                    </div>
                  </div>
                </div>

                {/* Billing Information */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-blue-800 mb-4 border-b border-blue-200 pb-2">
                    💼 Billing Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Address
                      </label>
                      <textarea
                        name="billingAddress"
                        value={formData.billingAddress}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter complete billing address (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing City
                      </label>
                      <input
                        type="text"
                        name="billingCity"
                        value={formData.billingCity}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter billing city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing State
                      </label>
                      <input
                        type="text"
                        name="billingState"
                        value={formData.billingState}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter billing state"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Billing Pincode
                      </label>
                      <input
                        type="text"
                        name="billingPincode"
                        value={formData.billingPincode}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter billing pincode"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST Number
                      </label>
                      <input
                        type="text"
                        name="billingGstNumber"
                        value={formData.billingGstNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter GST number (optional)"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={closeModals}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

