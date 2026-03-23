'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { CANTEEN_LITERS_PER_TIN } from '@/lib/canteenSupply';

interface RawMaterial {
  id: string;
  name: string;
  category: string;
  type: string;
  description?: string;
  unit: string;
  costPerUnit: number;
  supplier?: string;
  minimumStock: number;
  currentStock: number;
  gstRate: number;
  isActive: boolean;
}

interface RawMaterialPurchase {
  id: string;
  rawMaterialId: string;
  supplier: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  gstAmount: number;
  purchaseDate: string;
  invoiceNumber?: string;
  notes?: string;
}

export default function RawMaterialsPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [purchases, setPurchases] = useState<RawMaterialPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('seeds');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<RawMaterial | null>(null);
  
  // New states for oil tin and label management
  const [showOilTinForm, setShowOilTinForm] = useState(false);
  const [showBottlePouringForm, setShowBottlePouringForm] = useState(false);
  const [showBulkLabelForm, setShowBulkLabelForm] = useState(false);
  const [selectedOilTin, setSelectedOilTin] = useState<RawMaterial | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'seeds',
    stockStatus: 'all',
    supplier: 'all',
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  // Bulk operations
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Form states
  const [materialForm, setMaterialForm] = useState({
    name: '',
    category: 'seeds',
    type: '',
    description: '',
    unit: 'pieces',
    costPerUnit: 0,
    supplier: '',
    minimumStock: 0,
    currentStock: 0,
    gstRate: 18
  });

  const [purchaseForm, setPurchaseForm] = useState({
    rawMaterialId: '',
    supplier: '',
    quantity: 0,
    unitCost: 0,
    invoiceNumber: '',
    notes: ''
  });

  // New form states for oil tin and label management
  const [oilTinForm, setOilTinForm] = useState({
    oilType: 'groundnut',
    supplier: '',
    quantity: 0,
    costPerTin: 0,
    invoiceNumber: '',
    notes: ''
  });

  const [bottlePouringForm, setBottlePouringForm] = useState({
    oilTinId: '', // Single oil tin selection
    fiveLiterBottles: '',
    oneLiterBottles: '',
    fiveHundredMlBottles: '',
    twoHundredMlBottles: '',
    notes: ''
  });

  const [bulkLabelForm, setBulkLabelForm] = useState({
    selectedOils: [] as string[], // Array of oil types
    bottleSize: '5l',
    quantity: 0,
    supplier: 'Print Solutions Ltd.',
    costPerLabel: 0,
    notes: ''
  });

  const [showRetailSalesForm, setShowRetailSalesForm] = useState(false);
  const [retailSalesForm, setRetailSalesForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [] as Array<{
      oilType: string;
      bottleSize: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>,
    paymentMethod: 'cash',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Organized Raw Materials for Trinity Oil Mills
      const mockMaterials: RawMaterial[] = [
        // =================== PET BOTTLES ===================
        {
          id: 'rm-pet-5l',
          name: '🍶 PET Bottle 5 Liter',
          category: 'packaging',
          type: 'bottle',
          description: '5 liter PET bottles for bulk oil packaging',
          unit: 'pieces',
          costPerUnit: 25.00,
          supplier: 'ABC Packaging Co.',
          minimumStock: 50,
          currentStock: 120,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-pet-1l',
          name: '🍶 PET Bottle 1 Liter',
          category: 'packaging',
          type: 'bottle',
          description: '1 liter PET bottles for oil packaging',
          unit: 'pieces',
          costPerUnit: 12.00,
          supplier: 'ABC Packaging Co.',
          minimumStock: 100,
          currentStock: 500,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-pet-500ml',
          name: '🍶 PET Bottle 500ml',
          category: 'packaging',
          type: 'bottle',
          description: '500ml PET bottles for oil packaging',
          unit: 'pieces',
          costPerUnit: 8.00,
          supplier: 'ABC Packaging Co.',
          minimumStock: 100,
          currentStock: 300,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-pet-200ml',
          name: '🍶 PET Bottle 200ml',
          category: 'packaging',
          type: 'bottle',
          description: '200ml PET bottles for oil packaging',
          unit: 'pieces',
          costPerUnit: 5.00,
          supplier: 'ABC Packaging Co.',
          minimumStock: 50,
          currentStock: 200,
          gstRate: 18.00,
          isActive: true
        },

        // =================== BOTTLE CAPS (Size-specific) ===================
        {
          id: 'rm-caps-5l',
          name: '🧢 Bottle Caps (5L)',
          category: 'packaging',
          type: 'cap',
          description: 'Large plastic caps for 5L bottles',
          unit: 'pieces',
          costPerUnit: 5.00,
          supplier: 'ABC Packaging Co.',
          minimumStock: 50,
          currentStock: 150,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-caps-1l',
          name: '🧢 Bottle Caps (1L)',
          category: 'packaging',
          type: 'cap',
          description: 'Medium plastic caps for 1L bottles',
          unit: 'pieces',
          costPerUnit: 3.00,
          supplier: 'ABC Packaging Co.',
          minimumStock: 100,
          currentStock: 600,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-caps-500ml',
          name: '🧢 Bottle Caps (500ml)',
          category: 'packaging',
          type: 'cap',
          description: 'Standard plastic caps for 500ml bottles',
          unit: 'pieces',
          costPerUnit: 2.50,
          supplier: 'ABC Packaging Co.',
          minimumStock: 100,
          currentStock: 400,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-caps-200ml',
          name: '🧢 Bottle Caps (200ml)',
          category: 'packaging',
          type: 'cap',
          description: 'Small plastic caps for 200ml bottles',
          unit: 'pieces',
          costPerUnit: 2.00,
          supplier: 'ABC Packaging Co.',
          minimumStock: 50,
          currentStock: 250,
          gstRate: 18.00,
          isActive: true
        },

        // =================== CARDBOARD BOXES ===================
        {
          id: 'rm-cardboard',
          name: '📦 Cardboard Boxes',
          category: 'packaging',
          type: 'box',
          description: 'Cardboard boxes for canteen orders (1 box per canteen order)',
          unit: 'pieces',
          costPerUnit: 25.00,
          supplier: 'Box Makers Inc.',
          minimumStock: 50,
          currentStock: 150,
          gstRate: 18.00,
          isActive: true
        },
        // =================== LABELS (Oil Type + Size Specific) ===================
        
        // GROUNDNUT OIL LABELS
        {
          id: 'rm-labels-groundnut-5l',
          name: '🏷️ Groundnut Oil Labels (5L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 5L Groundnut Oil bottles',
          unit: 'pieces',
          costPerUnit: 2.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 50,
          currentStock: 200,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-groundnut-1l',
          name: '🏷️ Groundnut Oil Labels (1L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 1L Groundnut Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 200,
          currentStock: 1000,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-groundnut-500ml',
          name: '🏷️ Groundnut Oil Labels (500ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 500ml Groundnut Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.20,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 200,
          currentStock: 800,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-groundnut-200ml',
          name: '🏷️ Groundnut Oil Labels (200ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 200ml Groundnut Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.00,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 100,
          currentStock: 400,
          gstRate: 18.00,
          isActive: true
        },

        // GINGELLY OIL LABELS
        {
          id: 'rm-labels-gingelly-5l',
          name: '🏷️ Gingelly Oil Labels (5L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 5L Gingelly Oil bottles',
          unit: 'pieces',
          costPerUnit: 2.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 50,
          currentStock: 150,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-gingelly-1l',
          name: '🏷️ Gingelly Oil Labels (1L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 1L Gingelly Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 150,
          currentStock: 600,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-gingelly-500ml',
          name: '🏷️ Gingelly Oil Labels (500ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 500ml Gingelly Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.20,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 150,
          currentStock: 500,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-gingelly-200ml',
          name: '🏷️ Gingelly Oil Labels (200ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 200ml Gingelly Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.00,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 100,
          currentStock: 300,
          gstRate: 18.00,
          isActive: true
        },

        // COCONUT OIL LABELS
        {
          id: 'rm-labels-coconut-5l',
          name: '🏷️ Coconut Oil Labels (5L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 5L Coconut Oil bottles',
          unit: 'pieces',
          costPerUnit: 2.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 30,
          currentStock: 100,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-coconut-1l',
          name: '🏷️ Coconut Oil Labels (1L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 1L Coconut Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 100,
          currentStock: 400,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-coconut-500ml',
          name: '🏷️ Coconut Oil Labels (500ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 500ml Coconut Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.20,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 100,
          currentStock: 300,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-coconut-200ml',
          name: '🏷️ Coconut Oil Labels (200ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 200ml Coconut Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.00,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 50,
          currentStock: 200,
          gstRate: 18.00,
          isActive: true
        },

        // DEEPAM OIL LABELS
        {
          id: 'rm-labels-deepam-5l',
          name: '🏷️ Deepam Oil Labels (5L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 5L Deepam Oil bottles',
          unit: 'pieces',
          costPerUnit: 2.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 20,
          currentStock: 80,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-deepam-1l',
          name: '🏷️ Deepam Oil Labels (1L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 1L Deepam Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 100,
          currentStock: 350,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-deepam-500ml',
          name: '🏷️ Deepam Oil Labels (500ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 500ml Deepam Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.20,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 80,
          currentStock: 250,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-deepam-200ml',
          name: '🏷️ Deepam Oil Labels (200ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 200ml Deepam Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.00,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 50,
          currentStock: 150,
          gstRate: 18.00,
          isActive: true
        },

        // CASTOR OIL LABELS
        {
          id: 'rm-labels-castor-5l',
          name: '🏷️ Castor Oil Labels (5L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 5L Castor Oil bottles',
          unit: 'pieces',
          costPerUnit: 2.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 15,
          currentStock: 60,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-castor-1l',
          name: '🏷️ Castor Oil Labels (1L)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 1L Castor Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.50,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 80,
          currentStock: 200,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-castor-500ml',
          name: '🏷️ Castor Oil Labels (500ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 500ml Castor Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.20,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 60,
          currentStock: 180,
          gstRate: 18.00,
          isActive: true
        },
        {
          id: 'rm-labels-castor-200ml',
          name: '🏷️ Castor Oil Labels (200ml)',
          category: 'packaging',
          type: 'label',
          description: 'Labels for 200ml Castor Oil bottles',
          unit: 'pieces',
          costPerUnit: 1.00,
          supplier: 'Print Solutions Ltd.',
          minimumStock: 40,
          currentStock: 120,
          gstRate: 18.00,
          isActive: true
        },

        // =================== OIL TINS (16 LITERS) ===================
        {
          id: 'rm-groundnut-oil-tin',
          name: '🛢️ Groundnut Oil TIN (16L)',
          category: 'oil_tins',
          type: 'groundnut_tin',
          description: 'Groundnut oil purchased in 16-liter TINs from suppliers',
          unit: 'tins',
          costPerUnit: 2200.00,
          supplier: 'Groundnut Oil Suppliers Ltd.',
          minimumStock: 15,
          currentStock: 30,
          gstRate: 5.00,
          isActive: true
        },
        {
          id: 'rm-gingelly-oil-tin',
          name: '🛢️ Gingelly Oil TIN (16L)',
          category: 'oil_tins',
          type: 'gingelly_tin',
          description: 'Gingelly oil purchased in 16-liter TINs from suppliers',
          unit: 'tins',
          costPerUnit: 2600.00,
          supplier: 'Gingelly Oil Suppliers Ltd.',
          minimumStock: 12,
          currentStock: 25,
          gstRate: 5.00,
          isActive: true
        },
        {
          id: 'rm-coconut-oil-tin',
          name: '🛢️ Coconut Oil TIN (16L)',
          category: 'oil_tins',
          type: 'coconut_tin',
          description: 'Coconut oil purchased in 16-liter TINs from suppliers',
          unit: 'tins',
          costPerUnit: 2000.00,
          supplier: 'Coconut Oil Suppliers Ltd.',
          minimumStock: 10,
          currentStock: 20,
          gstRate: 5.00,
          isActive: true
        },
        {
          id: 'rm-deepam-oil-tin',
          name: '🛢️ Deepam Oil TIN (16L)',
          category: 'oil_tins',
          type: 'deepam_tin',
          description: 'Deepam oil purchased in 16-liter TINs from suppliers',
          unit: 'tins',
          costPerUnit: 2400.00,
          supplier: 'Deepam Oil Suppliers Ltd.',
          minimumStock: 10,
          currentStock: 25,
          gstRate: 5.00,
          isActive: true
        },
        {
          id: 'rm-castor-oil-tin',
          name: '🛢️ Castor Oil TIN (16L)',
          category: 'oil_tins',
          type: 'castor_tin',
          description: 'Castor oil purchased in 16-liter TINs from suppliers',
          unit: 'tins',
          costPerUnit: 2800.00,
          supplier: 'Castor Oil Suppliers Ltd.',
          minimumStock: 8,
          currentStock: 15,
          gstRate: 5.00,
          isActive: true
        },

        // =================== RAW MATERIALS FOR OIL PRODUCTION ===================
        {
          id: 'rm-groundnuts',
          name: '🥜 Groundnuts (Raw)',
          category: 'seeds',
          type: 'groundnut',
          description: 'Premium quality raw groundnuts for oil extraction',
          unit: 'kg',
          costPerUnit: 80.00,
          supplier: 'Local Farmers Cooperative',
          minimumStock: 1000,
          currentStock: 2500,
          gstRate: 5.00,
          isActive: true
        },
        {
          id: 'rm-sesame',
          name: '🌰 Sesame Seeds',
          category: 'seeds',
          type: 'sesame',
          description: 'High quality sesame seeds for gingelly oil production',
          unit: 'kg',
          costPerUnit: 120.00,
          supplier: 'Seed Traders Ltd.',
          minimumStock: 500,
          currentStock: 800,
          gstRate: 5.00,
          isActive: true
        },
        {
          id: 'rm-coconut',
          name: '🥥 Coconut (Copra)',
          category: 'seeds',
          type: 'coconut',
          description: 'Dried coconut copra for coconut oil extraction',
          unit: 'kg',
          costPerUnit: 60.00,
          supplier: 'Coconut Farmers Union',
          minimumStock: 800,
          currentStock: 1200,
          gstRate: 5.00,
          isActive: true
        },
        {
          id: 'rm-deepam-seeds',
          name: '🌱 Deepam Seeds',
          category: 'seeds',
          type: 'deepam',
          description: 'Premium deepam seeds for deepam oil extraction',
          unit: 'kg',
          costPerUnit: 90.00,
          supplier: 'Specialty Seeds Co.',
          minimumStock: 300,
          currentStock: 600,
          gstRate: 5.00,
          isActive: true
        },
        {
          id: 'rm-castor-seeds',
          name: '🌿 Castor Seeds',
          category: 'seeds',
          type: 'castor',
          description: 'High quality castor seeds for castor oil production',
          unit: 'kg',
          costPerUnit: 75.00,
          supplier: 'Castor Growers Association',
          minimumStock: 400,
          currentStock: 800,
          gstRate: 5.00,
          isActive: true
        },

        // =================== OTHER MATERIALS ===================
        {
          id: 'rm-packing-tape',
          name: '📦 Packing Tape',
          category: 'packaging',
          type: 'tape',
          description: 'Strong packing tape for sealing cardboard boxes (1 roll per 4 canteen orders)',
          unit: 'rolls',
          costPerUnit: 45.00,
          supplier: 'Packaging Supplies Co.',
          minimumStock: 20,
          currentStock: 50,
          gstRate: 18.00,
          isActive: true
        }
      ];

      setRawMaterials(mockMaterials.filter(m => m.category === 'seeds'));
    } catch (err) {
      setError('Failed to fetch raw materials data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In real implementation, this would call an API
      const newMaterial: RawMaterial = {
        id: `rm-${Date.now()}`,
        ...materialForm,
        isActive: true
      };
      setRawMaterials([...rawMaterials, newMaterial]);
      setMaterialForm({
        name: '',
        category: 'seeds',
        type: '',
        description: '',
        unit: 'pieces',
        costPerUnit: 0,
        supplier: '',
        minimumStock: 0,
        currentStock: 0,
        gstRate: 18
      });
      setShowAddForm(false);
    } catch (err) {
      setError('Failed to add raw material');
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const material = rawMaterials.find(m => m.id === purchaseForm.rawMaterialId);
      if (!material) return;

      const totalCost = purchaseForm.quantity * purchaseForm.unitCost;
      const gstAmount = (totalCost * material.gstRate) / 100;

      // Update stock
      setRawMaterials(rawMaterials.map(m => 
        m.id === purchaseForm.rawMaterialId 
          ? { ...m, currentStock: m.currentStock + purchaseForm.quantity }
          : m
      ));

      setPurchaseForm({
        rawMaterialId: '',
        supplier: '',
        quantity: 0,
        unitCost: 0,
        invoiceNumber: '',
        notes: ''
      });
      setShowPurchaseForm(false);
    } catch (err) {
      setError('Failed to record purchase');
    }
  };

  const handleEditMaterial = (material: RawMaterial) => {
    setEditingMaterial(material);
    setMaterialForm({
      name: material.name,
      category: material.category,
      type: material.type,
      description: material.description || '',
      unit: material.unit,
      costPerUnit: material.costPerUnit,
      supplier: material.supplier || '',
      minimumStock: material.minimumStock,
      currentStock: material.currentStock,
      gstRate: material.gstRate
    });
    setShowEditForm(true);
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    
    try {
      const updatedMaterial: RawMaterial = {
        ...editingMaterial,
        ...materialForm,
        isActive: true
      };
      
      setRawMaterials(rawMaterials.map(m => 
        m.id === editingMaterial.id ? updatedMaterial : m
      ));
      
      setEditingMaterial(null);
      setMaterialForm({
        name: '',
        category: 'seeds',
        type: '',
        description: '',
        unit: 'pieces',
        costPerUnit: 0,
        supplier: '',
        minimumStock: 0,
        currentStock: 0,
        gstRate: 18
      });
      setShowEditForm(false);
    } catch (err) {
      setError('Failed to update raw material');
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deletingMaterial) return;
    
    try {
      setRawMaterials(rawMaterials.filter(m => m.id !== deletingMaterial.id));
      setDeletingMaterial(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      setError('Failed to delete raw material');
    }
  };

  const confirmDelete = (material: RawMaterial) => {
    setDeletingMaterial(material);
    setShowDeleteConfirm(true);
  };

  const toggleMaterialStatus = async (materialId: string) => {
    try {
      setRawMaterials(rawMaterials.map(m => 
        m.id === materialId 
          ? { ...m, isActive: !m.isActive }
          : m
      ));
    } catch (err) {
      setError('Failed to update material status');
    }
  };

  const getStockStatus = (material: RawMaterial) => {
    if (material.currentStock <= material.minimumStock * 0.5) return 'critical';
    if (material.currentStock <= material.minimumStock) return 'low';
    if (material.currentStock >= material.minimumStock * 3) return 'high';
    return 'optimal';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      case 'high': return 'outline';
      default: return 'default';
    }
  };

  // Filter and sort materials
  const getFilteredAndSortedMaterials = () => {
    let filtered = rawMaterials.filter(material => {
      // Search filter
      const searchMatch = filters.search === '' || 
        material.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        material.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        material.supplier?.toLowerCase().includes(filters.search.toLowerCase());

      // Category filter
      const categoryMatch = filters.category === 'all' || material.category === filters.category;

      // Stock status filter
      const stockStatus = getStockStatus(material);
      const stockMatch = filters.stockStatus === 'all' || stockStatus === filters.stockStatus;

      // Supplier filter
      const supplierMatch = filters.supplier === 'all' || material.supplier === filters.supplier;

      // Seeds-only mode
      const tabMatch = material.category === 'seeds';

      return searchMatch && categoryMatch && stockMatch && supplierMatch && tabMatch;
    });

    // Sort materials
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'currentStock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'costPerUnit':
          aValue = a.costPerUnit;
          bValue = b.costPerUnit;
          break;
        case 'totalValue':
          aValue = a.currentStock * a.costPerUnit;
          bValue = b.currentStock * b.costPerUnit;
          break;
        case 'stockStatus':
          const statusOrder = { critical: 0, low: 1, optimal: 2, high: 3 };
          aValue = statusOrder[getStockStatus(a) as keyof typeof statusOrder];
          bValue = statusOrder[getStockStatus(b) as keyof typeof statusOrder];
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Get unique suppliers for filter dropdown
  const getUniqueSuppliers = () => {
    const suppliers = rawMaterials
      .map(m => m.supplier)
      .filter((supplier, index, arr) => supplier && arr.indexOf(supplier) === index)
      .sort();
    return suppliers;
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'seeds',
      stockStatus: 'all',
      supplier: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const exportToCSV = () => {
    const materials = getFilteredAndSortedMaterials();
    const csvContent = [
      ['Name', 'Category', 'Current Stock', 'Unit', 'Cost/Unit', 'Total Value', 'Min Stock', 'Supplier', 'Status'],
      ...materials.map(m => [
        m.name,
        m.category,
        m.currentStock.toString(),
        m.unit,
        m.costPerUnit.toString(),
        (m.currentStock * m.costPerUnit).toString(),
        m.minimumStock.toString(),
        m.supplier || '',
        getStockStatus(m)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raw-materials-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Bulk operations
  const toggleSelectAll = () => {
    const filteredMaterials = getFilteredAndSortedMaterials();
    if (selectedMaterials.length === filteredMaterials.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(filteredMaterials.map(m => m.id));
    }
  };

  const toggleSelectMaterial = (materialId: string) => {
    setSelectedMaterials(prev => 
      prev.includes(materialId) 
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const bulkDeactivate = () => {
    setRawMaterials(rawMaterials.map(m => 
      selectedMaterials.includes(m.id) 
        ? { ...m, isActive: false }
        : m
    ));
    setSelectedMaterials([]);
    setShowBulkActions(false);
  };

  const bulkActivate = () => {
    setRawMaterials(rawMaterials.map(m => 
      selectedMaterials.includes(m.id) 
        ? { ...m, isActive: true }
        : m
    ));
    setSelectedMaterials([]);
    setShowBulkActions(false);
  };

  const bulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedMaterials.length} selected materials?`)) {
      setRawMaterials(rawMaterials.filter(m => !selectedMaterials.includes(m.id)));
      setSelectedMaterials([]);
      setShowBulkActions(false);
    }
  };

  // New handlers for oil tin and label management
  const handleOilTinPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newMaterial: RawMaterial = {
        id: `rm-${oilTinForm.oilType}-oil-tin-${Date.now()}`,
        name: `🛢️ ${oilTinForm.oilType.charAt(0).toUpperCase() + oilTinForm.oilType.slice(1)} Oil TIN (16L)`,
        category: 'oil_tins',
        type: `${oilTinForm.oilType}_tin`,
        description: `${oilTinForm.oilType.charAt(0).toUpperCase() + oilTinForm.oilType.slice(1)} oil purchased in 16-liter TINs from suppliers`,
        unit: 'tins',
        costPerUnit: oilTinForm.costPerTin,
        supplier: oilTinForm.supplier,
        minimumStock: 10,
        currentStock: oilTinForm.quantity,
        gstRate: 5.00,
        isActive: true
      };
      
      setRawMaterials([...rawMaterials, newMaterial]);
      setOilTinForm({
        oilType: 'groundnut',
        supplier: '',
        quantity: 0,
        costPerTin: 0,
        invoiceNumber: '',
        notes: ''
      });
      setShowOilTinForm(false);
    } catch (err) {
      setError('Failed to add oil tin purchase');
    }
  };

  const handleBottlePouring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!bottlePouringForm.oilTinId) {
        alert('Please select an oil tin to pour from!');
        return;
      }

      const totalLitersUsed = (parseInt(bottlePouringForm.fiveLiterBottles || '0') * 5) + 
                             (parseInt(bottlePouringForm.oneLiterBottles || '0') * 1) + 
                             (parseInt(bottlePouringForm.fiveHundredMlBottles || '0') * 0.5) +
                             (parseInt(bottlePouringForm.twoHundredMlBottles || '0') * 0.2);

      if (totalLitersUsed === 0) {
        alert('Please enter bottle quantities!');
        return;
      }

      // Check if we have enough oil in the selected tin
      const selectedOilTin = rawMaterials.find(m => m.id === bottlePouringForm.oilTinId);
      if (!selectedOilTin) {
        alert('Selected oil tin not found!');
        return;
      }

      const availableLiters = selectedOilTin.currentStock * CANTEEN_LITERS_PER_TIN;
      
      if (totalLitersUsed > availableLiters) {
        alert(`Not enough oil in this tin! Available: ${availableLiters.toFixed(1)}L, Required: ${totalLitersUsed.toFixed(1)}L`);
        return;
      }

      // Update oil tin stock (pour from 1 tin at a time)
      setRawMaterials(rawMaterials.map(m => {
        if (m.id === bottlePouringForm.oilTinId) {
          return { ...m, currentStock: m.currentStock - (totalLitersUsed / CANTEEN_LITERS_PER_TIN) };
        }
        return m;
      }));

      // Add bottles to inventory (simplified - in real app, this would update product inventory)
      alert(`Successfully poured ${totalLitersUsed} liters into bottles from ${selectedOilTin.name}!`);
      
      setBottlePouringForm({
        oilTinId: '',
        fiveLiterBottles: '',
        oneLiterBottles: '',
        fiveHundredMlBottles: '',
        twoHundredMlBottles: '',
        notes: ''
      });
      setShowBottlePouringForm(false);
    } catch (err) {
      setError('Failed to process bottle pouring');
    }
  };

  const handleBulkLabelPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (bulkLabelForm.selectedOils.length === 0) {
        alert('Please select at least one oil type for labels!');
        return;
      }

      if (bulkLabelForm.quantity === 0) {
        alert('Please enter label quantity!');
        return;
      }

      let labelsAdded = 0;
      const oilTypes = ['groundnut', 'gingelly', 'coconut', 'deepam', 'castor'];

      // Process each selected oil type
      for (const oilType of bulkLabelForm.selectedOils) {
        const labelId = `rm-labels-${oilType}-${bulkLabelForm.bottleSize}`;
        const existingLabel = rawMaterials.find(m => m.id === labelId);
        
        if (existingLabel) {
          // Update existing label stock
          setRawMaterials(rawMaterials.map(m => 
            m.id === labelId 
              ? { ...m, currentStock: m.currentStock + bulkLabelForm.quantity }
              : m
          ));
        } else {
          // Create new label material
          const newLabel: RawMaterial = {
            id: labelId,
            name: `🏷️ ${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Oil Labels (${bulkLabelForm.bottleSize.toUpperCase()})`,
            category: 'packaging',
            type: 'label',
            description: `Labels for ${bulkLabelForm.bottleSize.toUpperCase()} ${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Oil bottles`,
            unit: 'pieces',
            costPerUnit: bulkLabelForm.costPerLabel,
            supplier: bulkLabelForm.supplier,
            minimumStock: 50,
            currentStock: bulkLabelForm.quantity,
            gstRate: 18.00,
            isActive: true
          };
          
          setRawMaterials(prev => [...prev, newLabel]);
        }
        labelsAdded++;
      }
      
      alert(`Successfully added ${bulkLabelForm.quantity} labels for ${labelsAdded} oil types!`);
      
      setBulkLabelForm({
        selectedOils: [],
        bottleSize: '5l',
        quantity: 0,
        supplier: 'Print Solutions Ltd.',
        costPerLabel: 0,
        notes: ''
      });
      setShowBulkLabelForm(false);
    } catch (err) {
      setError('Failed to add bulk labels');
    }
  };

  const addRetailSaleItem = () => {
    setRetailSalesForm({
      ...retailSalesForm,
      items: [...retailSalesForm.items, {
        oilType: 'groundnut',
        bottleSize: '1l',
        quantity: 1,
        unitPrice: 0,
        total: 0
      }]
    });
  };

  const updateRetailSaleItem = (index: number, field: string, value: any) => {
    const updatedItems = [...retailSalesForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total
    updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    
    setRetailSalesForm({ ...retailSalesForm, items: updatedItems });
  };

  const removeRetailSaleItem = (index: number) => {
    const updatedItems = retailSalesForm.items.filter((_, i) => i !== index);
    setRetailSalesForm({ ...retailSalesForm, items: updatedItems });
  };

  const handleRetailSales = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!retailSalesForm.customerName) {
        alert('Please enter customer name!');
        return;
      }

      if (retailSalesForm.items.length === 0) {
        alert('Please add at least one item!');
        return;
      }

      const totalAmount = retailSalesForm.items.reduce((sum, item) => sum + item.total, 0);
      
      // Process retail sale
      alert(`Retail sale completed!\nCustomer: ${retailSalesForm.customerName}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${retailSalesForm.paymentMethod}`);
      
      // Reset form
      setRetailSalesForm({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        items: [],
        paymentMethod: 'cash',
        notes: ''
      });
      setShowRetailSalesForm(false);
    } catch (err) {
      setError('Failed to process retail sale');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading raw materials..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏭 Raw Materials Management</h1>
          <p className="text-gray-600 mt-1">Seeds only view — manage seed inventory and seed purchases</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowAddForm(true)} className="bg-green-600 hover:bg-green-700">
            ➕ Add Seed
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="border-gray-300">
            📊 Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Filters & Search</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search materials..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="seeds">Seeds</option>
              </select>
            </div>

            {/* Stock Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Status</label>
              <select
                value={filters.stockStatus}
                onChange={(e) => setFilters({...filters, stockStatus: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All Status</option>
                <option value="critical">Critical</option>
                <option value="low">Low Stock</option>
                <option value="optimal">Optimal</option>
                <option value="high">Overstock</option>
              </select>
            </div>

            {/* Supplier Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={filters.supplier}
                onChange={(e) => setFilters({...filters, supplier: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">All Suppliers</option>
                {getUniqueSuppliers().map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="name">Name</option>
                <option value="currentStock">Current Stock</option>
                <option value="costPerUnit">Cost per Unit</option>
                <option value="totalValue">Total Value</option>
                <option value="stockStatus">Stock Status</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters({...filters, sortOrder: e.target.value as 'asc' | 'desc'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
          
          {/* Filter Results Summary */}
          <div className="mt-3 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Showing {getFilteredAndSortedMaterials().length} of {rawMaterials.filter(m => m.category === 'seeds').length} seeds
              {selectedMaterials.length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  ({selectedMaterials.length} selected)
                </span>
              )}
            </div>
            
            {/* Bulk Actions */}
            {selectedMaterials.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={bulkActivate}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ✅ Activate ({selectedMaterials.length})
                </Button>
                <Button
                  size="sm"
                  onClick={bulkDeactivate}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  ⏸️ Deactivate ({selectedMaterials.length})
                </Button>
                <Button
                  size="sm"
                  onClick={bulkDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  🗑️ Delete ({selectedMaterials.length})
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Seeds summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {rawMaterials.filter(m => m.category === 'seeds').length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Seed Types</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {rawMaterials.filter(m => m.category === 'seeds').reduce((sum, m) => sum + m.currentStock, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Total Seed Stock</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-700">
              ₹{rawMaterials.filter(m => m.category === 'seeds').reduce((sum, m) => sum + (m.currentStock * m.costPerUnit), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">Seed Inventory Value</div>
          </div>
        </Card>
      </div>

      {/* Materials Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Seeds</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-center py-3 px-4 font-medium text-gray-900 w-12">
                    <input
                      type="checkbox"
                      checked={selectedMaterials.length === getFilteredAndSortedMaterials().length && getFilteredAndSortedMaterials().length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Material</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Current Stock</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Min Stock</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Cost/Unit</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Total Value</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Supplier</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedMaterials().map((material) => {
                    const status = getStockStatus(material);
                    const totalValue = material.currentStock * material.costPerUnit;
                    
                    return (
                      <tr key={material.id} className={`border-b border-gray-100 ${selectedMaterials.includes(material.id) ? 'bg-blue-50' : ''}`}>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMaterials.includes(material.id)}
                            onChange={() => toggleSelectMaterial(material.id)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{material.name}</div>
                            <div className="text-sm text-gray-500">{material.description}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {material.currentStock.toLocaleString()} {material.unit}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {material.minimumStock.toLocaleString()} {material.unit}
                        </td>
                        <td className="py-3 px-4 text-right">
                          ₹{material.costPerUnit.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          ₹{totalValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={getStockStatusColor(status) as any}>
                            {status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {material.supplier || 'Not specified'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditMaterial(material)}
                              className="text-blue-600 hover:text-blue-700"
                              title="Edit Material"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleMaterialStatus(material.id)}
                              className={material.isActive ? "text-yellow-600 hover:text-yellow-700" : "text-green-600 hover:text-green-700"}
                              title={material.isActive ? "Deactivate" : "Activate"}
                            >
                              {material.isActive ? '⏸️' : '▶️'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmDelete(material)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete Material"
                            >
                              🗑️
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Add Material Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add New Raw Material</h3>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={materialForm.category}
                  onChange={(e) => setMaterialForm({...materialForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="seeds">Seeds</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <select
                  value={materialForm.unit}
                  onChange={(e) => setMaterialForm({...materialForm, unit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="pieces">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="liters">Liters</option>
                  <option value="meters">Meters</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit *</label>
                <input
                  type="number"
                  step="0.01"
                  value={materialForm.costPerUnit}
                  onChange={(e) => setMaterialForm({...materialForm, costPerUnit: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={materialForm.supplier}
                  onChange={(e) => setMaterialForm({...materialForm, supplier: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                  Add Material
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Form Modal */}
      {showPurchaseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Record Purchase</h3>
            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seed *</label>
                <select
                  value={purchaseForm.rawMaterialId}
                  onChange={(e) => setPurchaseForm({...purchaseForm, rawMaterialId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select Seed</option>
                  {rawMaterials.filter(material => material.category === 'seeds').map(material => (
                    <option key={material.id} value={material.id}>
                      {material.name} (₹{material.costPerUnit}/{material.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm({...purchaseForm, quantity: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                <input
                  type="number"
                  step="0.01"
                  value={purchaseForm.unitCost}
                  onChange={(e) => setPurchaseForm({...purchaseForm, unitCost: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <input
                  type="text"
                  value={purchaseForm.supplier}
                  onChange={(e) => setPurchaseForm({...purchaseForm, supplier: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Record Purchase
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPurchaseForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Form Modal */}
      {showEditForm && editingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Raw Material</h3>
            <form onSubmit={handleUpdateMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={materialForm.name}
                  onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={materialForm.category}
                  onChange={(e) => setMaterialForm({...materialForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="seeds">Seeds</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({...materialForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                <select
                  value={materialForm.unit}
                  onChange={(e) => setMaterialForm({...materialForm, unit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="pieces">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="liters">Liters</option>
                  <option value="meters">Meters</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.costPerUnit}
                    onChange={(e) => setMaterialForm({...materialForm, costPerUnit: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.gstRate}
                    onChange={(e) => setMaterialForm({...materialForm, gstRate: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={materialForm.supplier}
                  onChange={(e) => setMaterialForm({...materialForm, supplier: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.currentStock}
                    onChange={(e) => setMaterialForm({...materialForm, currentStock: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.minimumStock}
                    onChange={(e) => setMaterialForm({...materialForm, minimumStock: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                  Update Material
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-4">🗑️ Delete Raw Material</h3>
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <strong>{deletingMaterial.name}</strong>?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. All associated purchase history will also be removed.
              </p>
              
              {deletingMaterial.currentStock > 0 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 text-sm">
                    ⚠️ Warning: This material has {deletingMaterial.currentStock} {deletingMaterial.unit} in stock worth ₹{(deletingMaterial.currentStock * deletingMaterial.costPerUnit).toLocaleString()}.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleDeleteMaterial}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Delete
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Oil Tin Purchase Form Modal */}
      {showOilTinForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">🛢️ Add Oil Tin Purchase</h3>
            <form onSubmit={handleOilTinPurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Oil Type *</label>
                <select
                  value={oilTinForm.oilType}
                  onChange={(e) => setOilTinForm({...oilTinForm, oilType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="groundnut">Groundnut Oil</option>
                  <option value="gingelly">Gingelly Oil</option>
                  <option value="coconut">Coconut Oil</option>
                  <option value="deepam">Deepam Oil</option>
                  <option value="castor">Castor Oil</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <input
                  type="text"
                  value={oilTinForm.supplier}
                  onChange={(e) => setOilTinForm({...oilTinForm, supplier: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Oil supplier name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Tins) *</label>
                  <input
                    type="number"
                    min="1"
                    value={oilTinForm.quantity}
                    onChange={(e) => setOilTinForm({...oilTinForm, quantity: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Tin (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={oilTinForm.costPerTin}
                    onChange={(e) => setOilTinForm({...oilTinForm, costPerTin: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={oilTinForm.invoiceNumber}
                  onChange={(e) => setOilTinForm({...oilTinForm, invoiceNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Invoice number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={oilTinForm.notes}
                  onChange={(e) => setOilTinForm({...oilTinForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={2}
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">
                  Add Oil Tin
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowOilTinForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottle Pouring Form Modal */}
      {showBottlePouringForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🍶 Pour Oil into Small Packs</h3>
              <p className="text-gray-600">Select one oil tin and fill bottles</p>
            </div>
            
            <form onSubmit={handleBottlePouring} className="space-y-6">
              {/* Oil Tin Selection */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Choose Oil Tin</h4>
                <div className="grid grid-cols-1 gap-3">
                  {rawMaterials.filter(m => m.category === 'oil_tins' && m.currentStock > 0).map(tin => {
                    const oilEmoji = {
                      groundnut: '🥜',
                      gingelly: '🌰', 
                      coconut: '🥥',
                      deepam: '🌱',
                      castor: '🌿'
                    }[tin.type.replace('_tin', '')] || '🛢️';
                    
                    return (
                      <label key={tin.id} className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        bottlePouringForm.oilTinId === tin.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="oilTin"
                          value={tin.id}
                          checked={bottlePouringForm.oilTinId === tin.id}
                          onChange={(e) => setBottlePouringForm({...bottlePouringForm, oilTinId: e.target.value})}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{oilEmoji}</span>
                            <div>
                              <div className="font-semibold text-gray-900">{tin.name}</div>
                              <div className="text-sm text-gray-600">Available: {tin.currentStock.toFixed(1)} tins</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg text-blue-600">{tin.currentStock * 16}L</div>
                            <div className="text-xs text-gray-500">Total Oil</div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Bottle Selection */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Choose Bottle Sizes</h4>
                
                <div className="space-y-4">
                  {/* 5 Liter Bottles */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🍶</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">5 Liter Bottles</div>
                          <div className="text-sm text-gray-600">Large bottles for bulk orders</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(bottlePouringForm.fiveLiterBottles || '0');
                            if (current > 0) {
                              setBottlePouringForm({...bottlePouringForm, fiveLiterBottles: (current - 1).toString()});
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={bottlePouringForm.fiveLiterBottles}
                          onChange={(e) => setBottlePouringForm({...bottlePouringForm, fiveLiterBottles: e.target.value})}
                          className="w-16 h-8 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(bottlePouringForm.fiveLiterBottles || '0');
                            setBottlePouringForm({...bottlePouringForm, fiveLiterBottles: (current + 1).toString()});
                          }}
                          className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      Uses {(parseInt(bottlePouringForm.fiveLiterBottles || '0') * 5).toFixed(1)} liters
                    </div>
                  </div>

                  {/* 1 Liter Bottles */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🍶</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">1 Liter Bottles</div>
                          <div className="text-sm text-gray-600">Medium bottles for regular use</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(bottlePouringForm.oneLiterBottles || '0');
                            if (current > 0) {
                              setBottlePouringForm({...bottlePouringForm, oneLiterBottles: (current - 1).toString()});
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={bottlePouringForm.oneLiterBottles}
                          onChange={(e) => setBottlePouringForm({...bottlePouringForm, oneLiterBottles: e.target.value})}
                          className="w-16 h-8 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(bottlePouringForm.oneLiterBottles || '0');
                            setBottlePouringForm({...bottlePouringForm, oneLiterBottles: (current + 1).toString()});
                          }}
                          className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      Uses {parseInt(bottlePouringForm.oneLiterBottles || '0')} liters
                    </div>
                  </div>

                  {/* 500ml Bottles */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🍶</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">500ml Bottles</div>
                          <div className="text-sm text-gray-600">Small bottles for samples</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(bottlePouringForm.fiveHundredMlBottles || '0');
                            if (current > 0) {
                              setBottlePouringForm({...bottlePouringForm, fiveHundredMlBottles: (current - 1).toString()});
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={bottlePouringForm.fiveHundredMlBottles}
                          onChange={(e) => setBottlePouringForm({...bottlePouringForm, fiveHundredMlBottles: e.target.value})}
                          className="w-16 h-8 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(bottlePouringForm.fiveHundredMlBottles || '0');
                            setBottlePouringForm({...bottlePouringForm, fiveHundredMlBottles: (current + 1).toString()});
                          }}
                          className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-purple-600 font-medium">
                      Uses {(parseInt(bottlePouringForm.fiveHundredMlBottles || '0') * 0.5).toFixed(1)} liters
                    </div>
                  </div>

                  {/* 200ml Bottles */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🍶</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">200ml Bottles</div>
                          <div className="text-sm text-gray-600">Mini bottles for samples</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(bottlePouringForm.twoHundredMlBottles || '0');
                            if (current > 0) {
                              setBottlePouringForm({...bottlePouringForm, twoHundredMlBottles: (current - 1).toString()});
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={bottlePouringForm.twoHundredMlBottles}
                          onChange={(e) => setBottlePouringForm({...bottlePouringForm, twoHundredMlBottles: e.target.value})}
                          className="w-16 h-8 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(bottlePouringForm.twoHundredMlBottles || '0');
                            setBottlePouringForm({...bottlePouringForm, twoHundredMlBottles: (current + 1).toString()});
                          }}
                          className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-orange-600 font-medium">
                      Uses {(parseInt(bottlePouringForm.twoHundredMlBottles || '0') * 0.2).toFixed(1)} liters
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                <h5 className="font-bold text-green-800 mb-3 text-lg">📋 Order Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Total Oil Used</div>
                    <div className="font-bold text-lg text-green-700">
                      {((parseInt(bottlePouringForm.fiveLiterBottles || '0') * 5) + parseInt(bottlePouringForm.oneLiterBottles || '0') + (parseInt(bottlePouringForm.fiveHundredMlBottles || '0') * 0.5) + (parseInt(bottlePouringForm.twoHundredMlBottles || '0') * 0.2)).toFixed(1)}L
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">From Oil Tin</div>
                    <div className="font-bold text-lg text-blue-700">
                      {bottlePouringForm.oilTinId ? rawMaterials.find(m => m.id === bottlePouringForm.oilTinId)?.name.split(' ')[1] || 'Selected' : 'None'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    💡 Remember: 1 tin = 16 liters. Make sure you don't use more than available!
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={bottlePouringForm.notes}
                  onChange={(e) => setBottlePouringForm({...bottlePouringForm, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Any production notes or special instructions..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 text-lg font-semibold rounded-lg">
                  🍶 Pour Bottles Now
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowBottlePouringForm(false)}
                  className="flex-1 py-3 text-lg font-semibold rounded-lg border-2"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Label Purchase Form Modal */}
      {showBulkLabelForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">🏷️ Print Labels for All Oils</h3>
              <p className="text-gray-600">Select oil types and order labels in bulk</p>
            </div>
            
            <form onSubmit={handleBulkLabelPurchase} className="space-y-6">
              {/* Oil Type Selection */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Choose Oil Types</h4>
                <div className="grid grid-cols-1 gap-3">
                  {['groundnut', 'gingelly', 'coconut', 'deepam', 'castor'].map(oilType => {
                    const oilEmoji = {
                      groundnut: '🥜',
                      gingelly: '🌰', 
                      coconut: '🥥',
                      deepam: '🌱',
                      castor: '🌿'
                    }[oilType] || '🛢️';
                    
                    return (
                      <label key={oilType} className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                        bulkLabelForm.selectedOils.includes(oilType) 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={bulkLabelForm.selectedOils.includes(oilType)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkLabelForm({
                                ...bulkLabelForm,
                                selectedOils: [...bulkLabelForm.selectedOils, oilType]
                              });
                            } else {
                              setBulkLabelForm({
                                ...bulkLabelForm,
                                selectedOils: bulkLabelForm.selectedOils.filter(type => type !== oilType)
                              });
                            }
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{oilEmoji}</span>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {oilType.charAt(0).toUpperCase() + oilType.slice(1)} Oil
                              </div>
                              <div className="text-sm text-gray-600">
                                Labels for {bulkLabelForm.bottleSize.toUpperCase()} bottles
                              </div>
                            </div>
                          </div>
                          {bulkLabelForm.selectedOils.includes(oilType) && (
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                {bulkLabelForm.selectedOils.length === 0 && (
                  <p className="text-sm text-red-600 mt-3">Please select at least one oil type</p>
                )}
              </div>

              {/* Bottle Size Selection */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Choose Bottle Size</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: '5l', label: '5 Liter', desc: 'Large bottles', color: 'blue' },
                    { value: '1l', label: '1 Liter', desc: 'Medium bottles', color: 'green' },
                    { value: '500ml', label: '500ml', desc: 'Small bottles', color: 'purple' },
                    { value: '200ml', label: '200ml', desc: 'Sample bottles', color: 'orange' }
                  ].map(size => (
                    <label key={size.value} className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                      bulkLabelForm.bottleSize === size.value 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="bottleSize"
                        value={size.value}
                        checked={bulkLabelForm.bottleSize === size.value}
                        onChange={(e) => setBulkLabelForm({...bulkLabelForm, bottleSize: e.target.value})}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className={`w-12 h-12 bg-${size.color}-100 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                          <span className="text-xl">🍶</span>
                        </div>
                        <div className="font-semibold text-gray-900">{size.label}</div>
                        <div className="text-sm text-gray-600">{size.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Label Quantity */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 3: How Many Labels?</h4>
                <div className="bg-white rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (bulkLabelForm.quantity > 0) {
                          setBulkLabelForm({...bulkLabelForm, quantity: bulkLabelForm.quantity - 1});
                        }
                      }}
                      className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xl"
                    >
                      −
                    </button>
                    <div className="text-center">
                      <input
                        type="number"
                        min="1"
                        value={bulkLabelForm.quantity}
                        onChange={(e) => setBulkLabelForm({...bulkLabelForm, quantity: parseInt(e.target.value) || 0})}
                        className="w-20 h-12 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      <div className="text-sm text-gray-600 mt-1">Labels per oil type</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkLabelForm({...bulkLabelForm, quantity: bulkLabelForm.quantity + 1});
                      }}
                      className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center text-white font-bold text-xl"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-center mt-4">
                    <div className="text-sm text-gray-600">
                      Total Labels: <span className="font-bold text-purple-600">{bulkLabelForm.quantity * bulkLabelForm.selectedOils.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Printer Details */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Step 4: Printer Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Printing Company *</label>
                    <input
                      type="text"
                      value={bulkLabelForm.supplier}
                      onChange={(e) => setBulkLabelForm({...bulkLabelForm, supplier: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Enter printing company name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cost per Label (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkLabelForm.costPerLabel}
                      onChange={(e) => setBulkLabelForm({...bulkLabelForm, costPerLabel: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                <h5 className="font-bold text-purple-800 mb-4 text-lg">📋 Order Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Oil Types Selected</div>
                    <div className="font-bold text-lg text-purple-700">{bulkLabelForm.selectedOils.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Labels per Type</div>
                    <div className="font-bold text-lg text-purple-700">{bulkLabelForm.quantity}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Total Labels</div>
                    <div className="font-bold text-lg text-purple-700">{bulkLabelForm.quantity * bulkLabelForm.selectedOils.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Total Cost</div>
                    <div className="font-bold text-lg text-green-700">₹{(bulkLabelForm.quantity * bulkLabelForm.costPerLabel * bulkLabelForm.selectedOils.length).toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    💡 All labels will be printed at once for all selected oil types
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={bulkLabelForm.notes}
                  onChange={(e) => setBulkLabelForm({...bulkLabelForm, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                  placeholder="Any special printing requirements or delivery notes..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 text-lg font-semibold rounded-lg">
                  🏷️ Print Labels Now
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowBulkLabelForm(false)}
                  className="flex-1 py-3 text-lg font-semibold rounded-lg border-2"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retail Sales Form Modal */}
      {showRetailSalesForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">💰 Retail Sales</h3>
              <p className="text-gray-600">Sell oil bottles to customers</p>
            </div>
            
            <form onSubmit={handleRetailSales} className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                    <input
                      type="text"
                      value={retailSalesForm.customerName}
                      onChange={(e) => setRetailSalesForm({...retailSalesForm, customerName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={retailSalesForm.customerPhone}
                      onChange={(e) => setRetailSalesForm({...retailSalesForm, customerPhone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      value={retailSalesForm.customerAddress}
                      onChange={(e) => setRetailSalesForm({...retailSalesForm, customerAddress: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows={2}
                      placeholder="Enter customer address"
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Items</h4>
                  <Button type="button" onClick={addRetailSaleItem} className="bg-green-600 hover:bg-green-700">
                    ➕ Add Item
                  </Button>
                </div>
                
                {retailSalesForm.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No items added yet. Click "Add Item" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {retailSalesForm.items.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Oil Type</label>
                            <select
                              value={item.oilType}
                              onChange={(e) => updateRetailSaleItem(index, 'oilType', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="groundnut">🥜 Groundnut Oil</option>
                              <option value="gingelly">🌰 Gingelly Oil</option>
                              <option value="coconut">🥥 Coconut Oil</option>
                              <option value="deepam">🌱 Deepam Oil</option>
                              <option value="castor">🌿 Castor Oil</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bottle Size</label>
                            <select
                              value={item.bottleSize}
                              onChange={(e) => updateRetailSaleItem(index, 'bottleSize', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            >
                              <option value="5l">5 Liter</option>
                              <option value="1l">1 Liter</option>
                              <option value="500ml">500ml</option>
                              <option value="200ml">200ml</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => updateRetailSaleItem(index, 'quantity', Math.max(0, item.quantity - 1))}
                                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => updateRetailSaleItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-16 h-8 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                              <button
                                type="button"
                                onClick={() => updateRetailSaleItem(index, 'quantity', item.quantity + 1)}
                                className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateRetailSaleItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total (₹)</label>
                            <div className="px-3 py-2 bg-gray-100 rounded-md text-center font-semibold">
                              {item.total.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => removeRetailSaleItem(index)}
                              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white font-bold"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment & Summary */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-bold text-green-800 mb-3 text-lg">Payment Method</h5>
                    <div className="space-y-2">
                      {['cash', 'card', 'upi', 'bank_transfer'].map(method => (
                        <label key={method} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method}
                            checked={retailSalesForm.paymentMethod === method}
                            onChange={(e) => setRetailSalesForm({...retailSalesForm, paymentMethod: e.target.value})}
                            className="text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {method === 'cash' ? '💵 Cash' : 
                             method === 'card' ? '💳 Card' :
                             method === 'upi' ? '📱 UPI' : '🏦 Bank Transfer'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-bold text-green-800 mb-3 text-lg">Order Summary</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Items:</span>
                        <span className="font-semibold">{retailSalesForm.items.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Quantity:</span>
                        <span className="font-semibold">{retailSalesForm.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-green-700">
                        <span>Total Amount:</span>
                        <span>₹{retailSalesForm.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={retailSalesForm.notes}
                  onChange={(e) => setRetailSalesForm({...retailSalesForm, notes: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Any special notes or instructions..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 py-3 text-lg font-semibold rounded-lg">
                  💰 Complete Sale
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRetailSalesForm(false)}
                  className="flex-1 py-3 text-lg font-semibold rounded-lg border-2"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
}
