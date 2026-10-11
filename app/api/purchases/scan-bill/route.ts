import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `You are an expert Indian GST Tax Invoice & Purchase Bill OCR Parser.
Carefully read the purchase bill / invoice image and extract structured JSON data.

ORIENTATION & ROTATION:
Notice the image orientation: if the bill image is rotated or sideways, orient your reading direction to match the printed text along rows and columns.

TABLE COLUMN LAYOUT (Indian Tax Invoice Format):
Examine the table headers across each column carefully:
Typical order: [Sr / Sr. No] [HSN/SAC] [Description / Product Name] [MRP] [Qty / Quantity] [Rate] [Sub Total] [Disc %] [Sch Disc] [Taxable] [SGST] [CGST] [TOTAL]

RULES FOR EACH LINE ITEM:
1. "name": The clean product name from Description column (e.g. "JC-INSTANT HYDRATING CREAM(HBL)", "JC-INTENSE FIRMING AMPOULE").
2. "mrp": The Maximum Retail Price printed in the "MRP" column immediately following Description (e.g. 1790, 2490, 1950, 1280, 1340, 1490, 1790).
3. "qty": CRITICAL! Extract the true quantity number from the "Qty" / "Quantity" column (e.g. 15, 3, 3, 3, 3, 10, 5).
   - NEVER default qty to 1 if there is a number printed in the Qty column!
   - Look at the row math to confirm: Sub Total / Rate = Qty (e.g. 21480 / 1432 = 15).
4. "rate": The unit purchase price printed in the "Rate" column (e.g. 1432.00, 1992.00, 1560.00, 1024.00, 1072.00, 1192.00, 1432.00). DO NOT put the Sub Total (e.g. 21480) as rate! Rate is the single unit price.
5. "gst": Combined GST percentage (e.g. 18 if 9% SGST + 9% CGST).
6. "total": Line total amount after discounts + tax.

GENERAL INVOICE DETAILS:
- "supplier": The vendor / distributor issuing the bill (e.g. "MARKWELL SERVICES").
- "supplierInvoice": Invoice reference number (e.g. "JC 88").
- "date": Invoice date in YYYY-MM-DD or DD/MM/YYYY.
- "grandTotal": Final invoice total.

Return strictly raw valid JSON only:
{
  "supplier": "string",
  "supplierGstin": "string",
  "supplierPhone": "string",
  "supplierCity": "string",
  "supplierInvoice": "string",
  "date": "YYYY-MM-DD",
  "lines": [
    {
      "name": "string",
      "qty": 1,
      "rate": 100,
      "mrp": 150,
      "gst": 18,
      "total": 118
    }
  ],
  "grandTotal": 0
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let imageBase64: string = body.image || '';

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No image provided. Please upload or take a photo of the bill.' },
        { status: 400 }
      );
    }

    // Format data URL if needed
    if (!imageBase64.startsWith('data:')) {
      imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
    }

    const nimKey = process.env.NVIDIA_NIM_API_KEY || '';

    if (!nimKey || nimKey.startsWith('PASTE_')) {
      return NextResponse.json(
        { success: false, error: 'NVIDIA_NIM_API_KEY is not configured in .env.local' },
        { status: 500 }
      );
    }

    const reqData = {
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please scan and extract every single product row with exact Qty, Rate, MRP, and invoice details from this purchase bill into JSON.',
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      temperature: 0.05,
      max_tokens: 3500,
    };

    const apiRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${nimKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify(reqData),
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('NIM Vision Error:', apiRes.status, errText);
      return NextResponse.json(
        { success: false, error: `AI Vision OCR failed (HTTP ${apiRes.status}): ${errText.slice(0, 150)}` },
        { status: 502 }
      );
    }

    const jsonRes = await apiRes.json();
    const rawContent = jsonRes?.choices?.[0]?.message?.content || '';

    let parsedData: any = null;
    const objStart = rawContent.indexOf('{');
    const objEnd = rawContent.lastIndexOf('}');
    const arrStart = rawContent.indexOf('[');
    const arrEnd = rawContent.lastIndexOf(']');

    if (objStart !== -1 && objEnd !== -1 && (arrStart === -1 || objStart < arrStart)) {
      try {
        parsedData = JSON.parse(rawContent.slice(objStart, objEnd + 1));
      } catch (e) {
        console.error('JSON parse error (obj):', e);
      }
    } else if (arrStart !== -1 && arrEnd !== -1) {
      try {
        const arr = JSON.parse(rawContent.slice(arrStart, arrEnd + 1));
        parsedData = { lines: arr };
      } catch (e) {
        console.error('JSON parse error (arr):', e);
      }
    }

    if (!parsedData) {
      return NextResponse.json(
        { success: false, error: 'AI could not find structured invoice data in this image. Please ensure the bill is well-lit and clearly visible.' },
        { status: 422 }
      );
    }

    const rawLines = Array.isArray(parsedData)
      ? parsedData
      : (Array.isArray(parsedData.lines) ? parsedData.lines : []);

    // Sanitize and verify line items
    const sanitizedLines = rawLines.map((l: any) => {
      let qty = Number(l.qty) || 1;
      let rate = Number(l.rate) || 0;
      let mrp = Number(l.mrp) > 0 ? Number(l.mrp) : (rate > 0 ? rate : 0);
      let total = Number(l.total) || qty * rate;

      // Smart verification: If rate was mistakenly extracted as SubTotal (e.g. rate = 21480, mrp = 1790)
      if (mrp > 0 && rate > mrp * 1.5 && qty > 1) {
        rate = Number((rate / qty).toFixed(2));
      } else if (mrp > 0 && rate > mrp * 2 && total > 0) {
        rate = Number((total / Math.max(1, qty)).toFixed(2));
      }

      return {
        name: String(l.name || 'Product').trim(),
        qty: Math.max(1, qty),
        rate: Math.max(0, rate),
        mrp: Math.max(rate, mrp),
        gst: l.gst !== undefined ? Number(l.gst) : 18,
        total: total || qty * rate,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        supplier: parsedData.supplier || '',
        supplierGstin: parsedData.supplierGstin || '',
        supplierPhone: parsedData.supplierPhone || '',
        supplierCity: parsedData.supplierCity || '',
        supplierInvoice: parsedData.supplierInvoice || '',
        date: parsedData.date || new Date().toISOString().split('T')[0],
        lines: sanitizedLines,
        grandTotal: Number(parsedData.grandTotal) || 0,
      },
    });
  } catch (err: any) {
    console.error('Scan bill error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error processing bill image' },
      { status: 500 }
    );
  }
}
