import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';

// GET - Generate HTML Price List for Retail Products (invoice-style)
export async function GET(_request: NextRequest) {
  try {
    const connection = await createConnection();

    // Fetch all active retail selling products (exclude raw materials)
    const [rows]: any = await connection.query(
      `SELECT id, name, type, unit,
              base_price AS basePrice,
              retail_price AS retailPrice,
              gst_rate AS gstRate,
              gst_included AS gstIncluded,
              category,
              is_active AS isActive
       FROM products
       WHERE category != 'raw_material' AND is_active = TRUE
       ORDER BY 
         CASE 
           WHEN type LIKE '%ground%' THEN 1
           WHEN type LIKE '%gingelly%' OR type LIKE '%sesame%' THEN 2
           WHEN type LIKE '%coconut%' THEN 3
           WHEN type LIKE '%deepam%' THEN 4
           WHEN type LIKE '%castor%' THEN 5
           ELSE 9
         END,
         name ASC`);

    // Fetch latest sold price (unit_price) per product from retail sales, fallback to product.retail_price
    const [soldRows]: any = await connection.query(
      `SELECT si.product_id AS productId, si.unit_price AS unitPrice, s.created_at AS soldAt
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.sale_type = 'retail'
       ORDER BY s.created_at DESC`
    );

    await connection.end();

    // Build latest sold price map (first seen in DESC order is latest)
    const latestPriceByProduct: Record<string, number> = {};
    for (const r of soldRows as any[]) {
      if (r && r.productId && latestPriceByProduct[r.productId] == null) {
        latestPriceByProduct[r.productId] = Number(r.unitPrice || 0);
      }
    }

    // Group products by type for better presentation
    const typeToProducts: Record<string, any[]> = {};
    for (const p of rows) {
      const key = (p.type || 'Others').toString();
      if (!typeToProducts[key]) typeToProducts[key] = [];
      typeToProducts[key].push(p);
    }

    // Desired display order for wall poster
    const sectionOrder = ['Castor', 'Gingelly', 'Groundnut', 'Coconut', 'Deepam', ...Object.keys(typeToProducts).filter(k => !['Castor','Gingelly','Groundnut','Coconut','Deepam'].includes(k))];

    const priceListHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Retail Price List</title>
  <style>
    @page { size: A3 landscape; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 16pt; color: #000; background: #fff; width: 420mm; height: 297mm; line-height: 1.4; }
    .invoice-table { width: 100%; border-collapse: collapse; table-layout: auto; border: 4px solid #2d4e52; }
    .invoice-table td { border: 2px solid #c0c0c0; vertical-align: middle; font-size: 16pt; }
    .bg-header { background-color: #f8f9fa; padding: 10px 15px; border: 1px solid #c0c0c0; }
    .bg-dark { background-color: #2d4e52; color: #fff; padding: 20px 24px; border: 2px solid #2d4e52; font-weight: bold; }
    .bg-accent { background-color: #e8f4f8; padding: 10px 15px; border: 1px solid #c0c0c0; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .invoice-title { font-size: 48px !important; font-weight: bold; color: #ffffff !important; font-family: "Times New Roman", Times, serif !important; font-style: italic !important; }
    .logo-img { width: 350px; height: 100px; object-fit: contain; margin: 5px auto; display: block; }
    .promo {
      background: #fff7ed; border: 2px solid #fdba74; color: #9a3412; padding: 12px 18px; font-size: 20pt; font-weight: 900;
    }
    .sub-promo { color: #0f5132; background: #d1e7dd; border: 2px solid #badbcc; padding: 10px 14px; font-weight: 800; font-size: 16pt; }
    .section-title { background: #f1f5f9; border: 2px solid #cbd5e1; padding: 12px 14px; font-weight: 900; color: #0f172a; font-size: 20pt; }
    .row { height: 35px; }
    .row-alt { background: #f8fafc; }
    .muted { color: #475569; font-size: 12pt; }
    .big { font-size: 24pt; font-weight: 900; }
    .sizes { font-size: 18pt; font-weight: 800; letter-spacing: 0.5px; }
    .price { font-size: 28pt; font-weight: 1000; color: #0b5e2b; }
    .price-off { font-size: 24pt; font-weight: 900; color: #14532d; }
    .tamil { font-family: "Latha", "Tamil Sangam MN", "Tamil MN", "Tamil", serif; font-size: 0.85em; }
    .bilingual { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .print-controls { position: fixed; top: 20px; right: 20px; z-index: 1000; background: white; padding: 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; }
    .btn { padding: 8px 16px; margin: 0 4px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
    .btn-primary { background-color: #3b82f6; color: white; }
    .btn-secondary { background-color: #6b7280; color: white; }
    @media print { .print-controls { display: none; } }
  </style>
</head>
<body>
  <div class="print-controls">
    <button onclick="window.print()" class="btn btn-primary">🖨️ Print</button>
  </div>
  <table class="invoice-table">
    <!-- HEADER -->
    <tr style="height: 120px;">
      <td class="bg-header text-center" style="width: 40%; border-left: 2px solid #2d4e52; border-top: 2px solid #2d4e52; border-bottom: 1px solid #c0c0c0; border-right: none;" colspan="2">
        <img src="/TOM_logo.png" alt="Trinity Oil Mills" class="logo-img" />
      </td>
      <td class="bg-accent text-center" style="width: 20%; vertical-align: middle; border-top: 2px solid #2d4e52; border-bottom: 1px solid #c0c0c0; border-left: none; border-right: none;">
        <div class="bilingual" style="font-weight: bold; margin-bottom: 5px; color: #2d4e52;">
          <div>Price List</div>
          <div class="tamil">விலை பட்டியல்</div>
        </div>
        <div class="muted">${new Date().toLocaleDateString('en-GB')}</div>
      </td>
      <td class="bg-dark invoice-title text-center" style="width: 20%; vertical-align: middle; border-right: 2px solid #2d4e52; border-top: 2px solid #2d4e52; border-bottom: 1px solid #c0c0c0; border-left: none;">
        <div class="bilingual">
          <div>Price List</div>
          <div class="tamil">விலை பட்டியல்</div>
        </div>
      </td>
    </tr>


    <!-- Unified grid inside full-width cell to keep outer structure consistent -->
    <tr class="row">
      <td class="bg-header" colspan="4" style="padding: 0;">
        <table style="width:100%; border-collapse: collapse;">
          <tr>
            <td class="bg-dark text-left big" style="width: 20%; border: 2px solid #c0c0c0;">
              <div class="bilingual">
                <div>Oil</div>
                <div class="tamil">எண்ணெய்</div>
              </div>
            </td>
            <td class="bg-dark text-center big" style="width: 16%; border: 2px solid #c0c0c0;">5L</td>
            <td class="bg-dark text-center big" style="width: 16%; border: 2px solid #c0c0c0;">1L</td>
            <td class="bg-dark text-center big" style="width: 16%; border: 2px solid #c0c0c0;">500ml</td>
            <td class="bg-dark text-center big" style="width: 16%; border: 2px solid #c0c0c0;">200ml</td>
            <td class="bg-dark text-center big" style="width: 16%; border: 2px solid #c0c0c0;">100ml</td>
          </tr>
          ${(() => {
            const oils = [
              { key: 'gingelly', label: 'GINGELLY OIL*', tamil: 'நல்லெண்ணெய்*', tokens: ['gingelly','sesame'] },
              { key: 'ground', label: 'GROUNDNUT OIL*', tamil: 'கடலை எண்ணெய்*', tokens: ['ground','groundnut','peanut'] },
              { key: 'coconut', label: 'COCONUT OIL*', tamil: 'தேங்காய் எண்ணெய்*', tokens: ['coconut'] },
              { key: 'deepam', label: 'DEEPAM OIL*', tamil: 'தீப எண்ணெய்*', tokens: ['deepam'] },
              { key: 'castor', label: 'CASTOR OIL*', tamil: 'விளக்கெண்ணெய்*', tokens: ['castor'] },
            ];
            const sizeDefs = [
              { label: '5L', unit: '5l', hints: ['5l','5 l','5 literal','5 liter','5 litre','bottles'] },
              { label: '1L', unit: '1l', hints: ['1l','1 l','1 literal','1 liter','1 litre'] },
              { label: '500ml', unit: '500ml', hints: ['500ml','500 ml'] },
              { label: '200ml', unit: '200ml', hints: ['200ml','200 ml'] },
              { label: '100ml', unit: '100ml', hints: ['100ml','100 ml','retail'] },
            ];
            const normalize = (s: any) => (s || '').toString().toLowerCase().replace(/\s+/g, '');
            const containsAny = (s: string, tokens: string[]) => tokens.some(t => s.includes(t));
            const pickListForOil = (tokens: string[]) => {
              // Use all products; match by type or name tokens
              return (rows as any[]).filter(p => {
                const t = normalize(p.type);
                const n = normalize(p.name);
                return containsAny(t, tokens) || containsAny(n, tokens);
              });
            };
            const findBySize = (list: any[], size: { label: string; unit: string; hints: string[] }) => {
              // First try exact unit match
              const unitMatch = list.find(p => normalize(p.unit) === size.unit);
              if (unitMatch) return unitMatch;
              
              // Then try unit hints
              const unitHintMatch = list.find(p => containsAny(normalize(p.unit), size.hints));
              if (unitHintMatch) return unitHintMatch;
              
              // Finally try name hints
              return list.find(p => containsAny(normalize(p.name), size.hints));
            };
            const rowsHtml: string[] = [];
            for (const oil of oils) {
              const list = pickListForOil(oil.tokens);
              const cells = sizeDefs.map(sz => {
                const pr = findBySize(list, sz);
                // Use retail price rounded to nearest ₹10 for price list
                const retailPrice = pr ? Number(pr.retailPrice || 0) : null;
                const roundedPrice = retailPrice ? Math.round(retailPrice / 10) * 10 : null;
                return `<td class=\"text-center\" style=\"border: 2px solid #c0c0c0; padding: 6px 8px;\">${roundedPrice != null && roundedPrice > 0 ? `<span class=\"price\">₹ ${roundedPrice.toFixed(0)}</span>` : '<span class=\"price\">-</span>'}</td>`;
              }).join('');
               rowsHtml.push(`
                 <tr>
                   <td class=\"text-left big\" style=\"border: 2px solid #c0c0c0; padding: 8px 10px;\">
                     <div class=\"bilingual\">
                       <div>${oil.label}</div>
                       <div class=\"tamil\">${oil.tamil}</div>
                     </div>
                   </td>
                   ${cells}
                 </tr>
               `);
            }
            return rowsHtml.join('');
          })()}
        </table>
      </td>
    </tr>

    <!-- GST NOTE -->
    <tr class="row">
      <td class="text-center" colspan="4" style="padding: 12px; background-color: #f8f9fa; border: 1px solid #c0c0c0; font-size: 16pt; color: #2d4e52; font-weight: bold;">
        * Including 5% GST / * 5% GST உட்பட
      </td>
    </tr>

    <!-- PROMO LINES -->
    <tr class="row">
      <td class="promo text-center" colspan="4">
        <div class="bilingual">
          <div>Bring your Bottle and get ₹10 Discount on Each product</div>
          <div class="tamil">உங்கள் பாட்டில் கொண்டு வந்து ஒவ்வொரு பொருளிலும் ₹10 தள்ளுபடி பெறுங்கள்</div>
        </div>
      </td>
    </tr>
    <tr class="row">
      <td class="sub-promo text-center" colspan="4">
        <div class="bilingual">
          <div>Free door delivery for 5 ltrs and above</div>
          <div class="tamil">5 லிட்டர் மற்றும் அதற்கு மேல் இலவச வீட்டு விநியோகம்</div>
        </div>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr class="row">
      <td class="bg-header text-center" colspan="4" style="font-size: 12pt; padding: 12px 16px;">
        <div class="bilingual">
          <div>Trinity Oil Mills, 337/339, Paper Mills Road, Opposite Murasoli Maran Park, Perambur-600011.</div>
          <div class="tamil">டிரினிட்டி ஆயில் மில்ஸ், 337/339, பேப்பர் மில்ஸ் சாலை, முரசொலி மாறன் பூங்கா எதிரில், பெரம்பூர்-600011.</div>
          <div style="margin-top: 8px;">Tel: 99520 55660 / 97109 03330 · www.Trinityoil.in</div>
        </div>
      </td>
    </tr>
  </table>
  <script>
    document.title = 'Retail Price List - ' + new Date().toLocaleDateString('en-GB');
  </script>
</body>
</html>`;

    return new NextResponse(priceListHTML, { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('Price list HTML error:', error);
    return NextResponse.json({ error: 'Failed to generate price list' }, { status: 500 });
  }
}


