# 💰 Trinity Oil Mills - Financial Management Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Total Stock Value](#total-stock-value)
3. [Savings & Investments](#savings--investments)
4. [Book Value of Company](#book-value-of-company)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Navigation & Access](#navigation--access)
8. [User Guide](#user-guide)
9. [Troubleshooting](#troubleshooting)

---

## 📊 Overview

The Trinity Oil Mills Financial Management system has been enhanced with three powerful new features to provide comprehensive financial insights:

- **📦 Total Stock Value** - Real-time inventory valuation and analytics
- **💰 Savings & Investments** - Personal and business investment portfolio tracking
- **🏢 Book Value** - Complete company net worth calculation and balance sheet

### Key Benefits
- ✅ **Real-time calculations** using live business data
- ✅ **Cross-platform availability** (Web + Mobile apps)
- ✅ **Role-based access control** (Admin & Accountant only)
- ✅ **Offline support** on mobile with intelligent caching
- ✅ **Professional reporting** with detailed breakdowns

---

## 📦 Total Stock Value

### Purpose
Calculate and analyze the current value of all inventory items, providing insights into investment, potential profit, and stock management efficiency.

### Features

#### 📈 Summary Dashboard
- **Total Items Count** - Number of different products in inventory
- **Total Quantity** - Sum of all quantities across products
- **Cost Value** - Total investment in inventory at cost price
- **Retail Value** - Potential revenue at current retail prices
- **Potential Profit** - Difference between retail and cost values with margin percentage

#### 📊 Detailed Analytics
- **Category Breakdown** - Stock value by product category (Produced vs Purchased)
- **Location Analysis** - Value distribution across storage locations
- **Low Stock Alerts** - Items with quantities below threshold (< 50 units)
- **Profit Margin Analysis** - ROI calculations and profit potential

#### 🔍 Data Sources
- **Inventory Table** - Current stock quantities and cost prices
- **Products Table** - Retail pricing and product details
- **Real-time Calculation** - No cached data, always current

### Access Points
- **Web**: `/dashboard/admin/stock-value`
- **Mobile**: Dashboard → Money & Finance → Stock Value
- **Sidebar**: Financial Management → Total Stock Value

---

## 💰 Savings & Investments

### Purpose
Track personal and business investments, monitor portfolio performance, and analyze financial growth over time.

### Investment Types Supported
1. **🏦 Savings Account** - Regular bank savings
2. **📈 Fixed Deposit** - Bank FDs and term deposits  
3. **📊 Mutual Fund** - Mutual fund investments
4. **📈 Stocks** - Share market investments
5. **🏠 Property** - Real estate investments
6. **🥇 Gold** - Gold investments
7. **💎 General Investment** - Other investments
8. **💼 Other** - Miscellaneous financial assets

### Features

#### 💼 Portfolio Management
- **Investment Tracking** - Add, edit, delete investments
- **Performance Monitoring** - Real-time P&L calculations
- **Type Categorization** - Organize by investment type
- **Status Management** - Active, Matured, Closed, Sold

#### 📊 Analytics Dashboard
- **Total Investment** - Sum of all invested amounts
- **Current Value** - Current market value of portfolio
- **Gain/Loss** - Profit or loss with percentage returns
- **Portfolio Breakdown** - Performance by investment type

#### 📝 Detailed Information
- **Investment Details** - Title, description, amount, dates
- **Institution Tracking** - Bank/broker information
- **Account Numbers** - Reference tracking
- **Interest Rates** - Expected returns
- **Maturity Dates** - Investment timeline management

### Access Points
- **Web**: `/dashboard/admin/savings-investments`
- **Mobile**: Dashboard → Money & Finance → Investments
- **Sidebar**: Financial Management → Savings & Investments

---

## 🏢 Book Value of Company

### Purpose
Calculate the company's net worth using a comprehensive balance sheet approach, providing insights into financial health and business valuation.

### Financial Calculations

#### 📈 Assets Calculation
**Current Assets:**
- **Cash & Bank** - Revenue minus expenses (positive cash flow)
- **Inventory** - Current stock at cost price
- **Accounts Receivable** - Currently set to 0 (immediate cash sales)

**Fixed Assets:**
- **Investments** - Current value of savings & investments
- **Equipment** - Not tracked (requires separate asset management)
- **Property** - Not tracked (requires property valuation)

#### 📉 Liabilities Calculation
**Current Liabilities:**
- **Accounts Payable** - Negative cash flow (if expenses > revenue)
- **Short Term Loans** - Not tracked (requires loan management)

**Long Term Liabilities:**
- **Long Term Loans** - Not tracked (requires loan management)

#### 💰 Equity Calculation
- **Book Value** = Total Assets - Total Liabilities
- **Retained Earnings** = Total Revenue - Total Expenses

### Key Financial Ratios

#### 📊 Performance Metrics
- **Inventory Turnover** = Revenue ÷ Inventory Cost Value
- **Asset Turnover** = Revenue ÷ Total Assets
- **Return on Assets (ROA)** = Net Income ÷ Total Assets × 100

### Detailed Breakdown
- **Revenue vs Expenses** - Complete P&L summary
- **Inventory Valuation** - Cost vs retail value analysis
- **Investment Performance** - P&L from investment portfolio
- **Company Valuation** - Complete balance sheet breakdown

### Access Points
- **Web**: `/dashboard/admin/book-value`
- **Mobile**: Dashboard → Money & Finance → Book Value
- **Sidebar**: Financial Management → Book Value

---

## 🔌 API Endpoints

### Savings & Investments

#### GET `/api/savings-investments`
**Purpose**: Fetch all savings and investments
**Response**: 
```json
{
  "success": true,
  "data": [
    {
      "id": "si-123456789",
      "type": "fixed_deposit",
      "title": "SBI Fixed Deposit",
      "amount": "100000",
      "currentValue": "110000",
      "investmentDate": "2024-01-15T00:00:00.000Z",
      "maturityDate": "2025-01-15T00:00:00.000Z",
      "interestRate": "8.5",
      "institution": "State Bank of India",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### POST `/api/savings-investments`
**Purpose**: Create new investment
**Required Fields**: `type`, `title`, `amount`, `investmentDate`
**Optional Fields**: `description`, `currentValue`, `maturityDate`, `interestRate`, `institution`, `accountNumber`, `status`

#### PUT `/api/savings-investments/[id]`
**Purpose**: Update existing investment
**Body**: Same as POST (partial updates allowed)

#### DELETE `/api/savings-investments/[id]`
**Purpose**: Delete investment record

### Book Value

#### GET `/api/book-value`
**Purpose**: Calculate company book value
**Response**:
```json
{
  "success": true,
  "data": {
    "assets": {
      "current": {
        "cash": 50000,
        "inventory": 150000,
        "totalCurrent": 200000
      },
      "fixed": {
        "investments": 110000,
        "totalFixed": 110000
      },
      "total": 310000
    },
    "liabilities": {
      "current": {
        "accountsPayable": 0,
        "totalCurrent": 0
      },
      "total": 0
    },
    "equity": {
      "bookValue": 310000,
      "retainedEarnings": 50000
    },
    "metrics": {
      "inventoryTurnover": 2.5,
      "assetTurnover": 1.8,
      "returnOnAssets": 15.2
    }
  }
}
```

---

## 🗄️ Database Schema

### Savings & Investments Table
```sql
CREATE TABLE savings_investments (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'savings', 'investment', 'fixed_deposit', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2),
  investment_date DATETIME NOT NULL,
  maturity_date DATETIME,
  interest_rate DECIMAL(5,2),
  institution VARCHAR(255),
  account_number VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'matured', 'closed', 'sold'
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Integration with Existing Tables
- **Products** - Used for inventory retail pricing
- **Inventory** - Used for stock quantities and cost prices
- **Sales** - Used for revenue calculations
- **Expenses** - Used for expense calculations and cash flow

---

## 🧭 Navigation & Access

### Web Application
**Sidebar Organization** (Financial Management section):
1. **Daily Operations**
   - Daily Expenses
   - Loan Management
2. **Asset Valuation** ⭐ NEW
   - Total Stock Value
   - Savings & Investments  
   - Book Value
3. **Reports & Analysis**
   - Financial Reports
   - Historical P&L
   - GST Reports
   - Cost Calculator

**Dashboard Quick Actions** (Money section):
- 📦 Stock Value
- 💰 Investments
- 🏢 Book Value
- 📊 Financial Reports

### Mobile Application
**Navigation Stack**:
- `StockValue` - Total Stock Value screen
- `SavingsInvestments` - Investment portfolio screen
- `BookValue` - Company book value screen

**Dashboard Quick Actions** (Money & Finance category):
- Stock Value → Navigate to StockValueScreen
- Investments → Navigate to SavingsInvestmentsScreen  
- Book Value → Navigate to BookValueScreen

### Role-Based Access
- **Admin** - Full access to all financial features
- **Accountant** - Full access to all financial features  
- **Retail Staff** - No access to financial management features

---

## 📱 User Guide

### Getting Started

#### 1. Accessing Financial Features
**Web Application:**
1. Login as Admin or Accountant
2. Navigate to sidebar → Financial Management
3. Select desired feature (Stock Value, Investments, Book Value)

**Mobile Application:**
1. Login as Admin or Accountant
2. Go to Dashboard
3. Scroll to "Money & Finance" section
4. Tap on desired feature

#### 2. Total Stock Value
**What you'll see:**
- Current inventory worth at cost price
- Potential revenue at retail prices
- Profit margins and stock analytics
- Low stock warnings

**How to use:**
- View real-time stock valuation
- Analyze profit potential by category
- Identify slow-moving inventory
- Plan restocking based on value analysis

#### 3. Savings & Investments
**Adding an Investment:**
1. Click/Tap "Add Investment"
2. Select investment type (FD, Mutual Fund, etc.)
3. Fill in details (amount, date, institution)
4. Save investment

**Tracking Performance:**
- Monitor real-time P&L
- Update current values periodically
- View portfolio breakdown
- Track maturity dates

#### 4. Book Value Calculation
**Understanding the Data:**
- **Assets** = What your company owns
- **Liabilities** = What your company owes
- **Book Value** = Assets - Liabilities (Net Worth)

**Key Insights:**
- Company's financial health
- Growth over time
- Return on assets
- Asset efficiency ratios

### Best Practices

#### 📦 Stock Value Management
- **Regular Monitoring** - Check weekly for inventory optimization
- **Category Analysis** - Focus on high-value, slow-moving categories
- **Profit Optimization** - Adjust pricing based on margin analysis
- **Stock Alerts** - Reorder before reaching low stock thresholds

#### 💰 Investment Portfolio
- **Regular Updates** - Update current values monthly
- **Diversification** - Track different investment types
- **Performance Review** - Analyze gains/losses quarterly
- **Documentation** - Keep detailed records for tax purposes

#### 🏢 Book Value Monitoring
- **Monthly Reviews** - Track company growth trends
- **Ratio Analysis** - Monitor efficiency improvements
- **Asset Optimization** - Focus on high-ROA investments
- **Financial Planning** - Use insights for business decisions

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Data Not Loading
**Symptoms**: Empty screens, loading spinners
**Solutions**:
- Check internet connection
- Verify user permissions (Admin/Accountant only)
- Clear browser cache/app data
- Contact support if API is down

#### 2. Incorrect Calculations
**Symptoms**: Unexpected values, zero amounts
**Solutions**:
- Verify inventory data is current
- Check product pricing is set correctly
- Ensure sales/expense data is accurate
- Refresh page/screen to recalculate

#### 3. Mobile Offline Issues
**Symptoms**: Data not available offline
**Solutions**:
- Ensure data was loaded while online
- Force refresh when connected
- Check AsyncStorage cache
- Update app if persistent issues

#### 4. Permission Denied
**Symptoms**: Cannot access financial features
**Solutions**:
- Verify user role (Admin/Accountant required)
- Contact admin to update permissions
- Re-login to refresh session
- Check with system administrator

### Performance Optimization

#### 🌐 Web Application
- Financial calculations are performed server-side
- Results are cached for 5 minutes for performance
- Large datasets are paginated automatically
- Use browser refresh to force recalculation

#### 📱 Mobile Application
- Data is cached locally for offline access
- Pull-to-refresh updates all financial data
- Background sync when connectivity restored
- Local calculations for real-time updates

### Support Contact
For technical issues or questions about financial features:
- **Email**: support@trinityoil.in
- **Documentation**: Check this guide first
- **System Admin**: Contact your IT administrator
- **User Training**: Request additional training if needed

---

## 📈 Future Enhancements

### Planned Features
- **🏭 Equipment Asset Tracking** - Track machinery and equipment values
- **🏠 Property Valuation** - Real estate asset management
- **💳 Loan Management Integration** - Complete liability tracking
- **📊 Advanced Analytics** - Trend analysis and forecasting
- **📧 Automated Reports** - Scheduled financial summaries
- **🔄 Bank Integration** - Automatic transaction imports

### Version History
- **v1.0** - Initial release with Stock Value, Investments, and Book Value
- **v1.1** - Enhanced mobile offline support and caching
- **v1.2** - Improved navigation and user experience

---

*This documentation is current as of the latest release. For updates and additional features, please refer to the latest version of this guide.*

