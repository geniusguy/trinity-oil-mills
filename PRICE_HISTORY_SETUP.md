# 📊 Historical Pricing System Setup Guide

## 🎯 Overview

This implementation provides a complete historical pricing system for Trinity Oil Mills that ensures accurate PNL calculations with date-based pricing. When prices change, historical data maintains accuracy for financial reporting.

## 🗃️ Database Changes

### New Tables Added:
1. **product_price_history** - Tracks all product price changes with effective dates
2. **raw_material_price_history** - Tracks raw material cost changes  
3. **production_cost_history** - Records actual costs used during production

## 🚀 Installation Steps

### 1. Run Database Migration
```bash
# Navigate to oil-shop-web directory
cd oil-shop-web

# Run the migration script
node migrate-price-history.js
```

### 2. Initialize Price History (First Time Only)
After migration, call the API to initialize existing data:
```bash
# Using curl (replace with your actual admin credentials)
curl -X POST http://localhost:3001/api/price-history/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or use the admin interface at: `/dashboard/admin/price-management`

## 📈 Features Implemented

### 1. Price Management
- **Location**: `/dashboard/admin/price-management`
- **Features**: 
  - View price history for any product
  - Update prices with effective dates
  - Bulk price updates
  - Add notes for price changes

### 2. Historical PNL Reports
- **Location**: `/dashboard/admin/historical-pnl`
- **Features**:
  - Period-based PNL calculations using historical prices
  - Compare different time periods
  - Accurate cost calculations based on production dates
  - Sales breakdown with historical pricing

### 3. API Endpoints

#### Product Price Management:
- `GET /api/price-history/products?productId=X` - Get price history
- `POST /api/price-history/products` - Update product price
- `PUT /api/price-history/products` - Bulk update prices

#### Raw Material Price Management:
- `GET /api/price-history/raw-materials?rawMaterialId=X` - Get material price
- `POST /api/price-history/raw-materials` - Update material price

#### Historical Reports:
- `GET /api/reports/historical-pnl?startDate=X&endDate=Y` - Generate PNL report
- `POST /api/reports/historical-pnl` - Compare periods

## 💡 Usage Examples

### Update Product Price
```javascript
// Example: Update Gingelly Oil price effective from tomorrow
const response = await fetch('/api/price-history/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productId: 'gingelly-oil-1l',
    basePrice: 450.00,
    retailPrice: 500.00,
    gstRate: 5.00,
    effectiveDate: '2024-01-15',
    notes: 'Price increase due to raw material cost'
  })
});
```

### Get Historical PNL
```javascript
// Example: Get PNL for last month with comparison
const response = await fetch('/api/reports/historical-pnl?startDate=2023-12-01&endDate=2023-12-31&compareWith=previous_period');
const data = await response.json();
```

## 🔧 How It Works

### Price Tracking
1. **Current Prices**: Stored in main `products` and `raw_materials` tables
2. **Historical Prices**: All changes tracked in `*_price_history` tables
3. **Effective Dates**: Each price change has start/end dates
4. **Automatic Closure**: Previous prices automatically get end dates

### PNL Calculation
1. **Sales Revenue**: Uses actual sale prices (already recorded)
2. **Production Cost**: Calculated using raw material prices at production date
3. **Historical Accuracy**: Each sale uses costs from its actual production date
4. **Comparison**: Compare different periods with their respective pricing

### Cost Calculation Flow
```
Sale Date: 2024-01-10
└── Product: Gingelly Oil 1L
    └── Production Date: 2024-01-05
        └── Raw Materials Cost (as of 2024-01-05):
            ├── Sesame Seeds: ₹80/kg (price effective 2024-01-01)
            ├── Bottle: ₹15/piece (price effective 2023-12-15)
            └── Label: ₹2/piece (price effective 2024-01-03)
```

## 📊 Benefits

### ✅ Accurate Financial Reporting
- **True Profit Margins**: Based on actual costs at time of production
- **Historical Trends**: See real performance over time
- **Regulatory Compliance**: Proper audit trail for tax purposes

### ✅ Business Intelligence
- **Price Impact Analysis**: See how price changes affect profitability
- **Cost Trend Analysis**: Track raw material cost fluctuations
- **Period Comparisons**: Compare performance across different timeframes

### ✅ Operational Benefits
- **Automated Tracking**: No manual intervention required
- **Bulk Updates**: Update multiple prices at once
- **Future Dating**: Set prices to take effect on specific dates

## 🔒 Permissions

- **Admin**: Full access to all price management and reporting
- **Accountant**: View reports and update prices
- **Staff**: View-only access to current prices

## 🚨 Important Notes

1. **Migration First**: Always run the migration before using the system
2. **Initialize Once**: Only run initialization API once for existing data
3. **Backup Database**: Take backup before running migration
4. **Test Environment**: Test in development before production

## 📞 Support

If you encounter any issues:
1. Check the console logs for detailed error messages
2. Ensure all dependencies are installed
3. Verify database connection settings
4. Check user permissions for API access

## 🎉 Success!

Once implemented, you'll have:
- ✅ Accurate historical PNL calculations
- ✅ Complete price change audit trail  
- ✅ Professional price management interface
- ✅ Reliable financial reporting system

Your Trinity Oil Mills system now maintains pricing accuracy over time for proper business analysis! 🚀
