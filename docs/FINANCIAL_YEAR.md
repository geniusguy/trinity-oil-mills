# Indian financial year (Apr–Mar)

Business logic uses **1 April – 31 March** (e.g. **2 Feb 2025 → FY 2024-25**).

Shared helpers live in `src/lib/financialYear.ts`:

- `getFinancialYearStartYear(date)` – calendar year of April that starts the FY  
- `getFinancialYearLabelForDate(date)` – e.g. `"2024-25"`  
- `getInvoiceFinancialYearSuffix(date)` – same label for invoice numbers  
- `INVOICE_NUMBER_FULL_REGEX` – validates `C0001/2024-25` or legacy `C0001/2026`

New invoices use **`C0001/2024-25`** style; the **invoice date** (not only “today”) selects the FY for numbering and sequence.
