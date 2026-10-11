import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_INSTRUCTION = `You are an expert Indian GST Tax Invoice & Purchase Bill OCR Parser.
Carefully read the purchase bill / invoice image and extract structured JSON data.

Rules:
1. Extract the Vendor/Seller name (the party issuing the bill) into "supplier". Look at header, top right, or bottom seal/stamp (e.g. "MARKWELL SERVICES").
2. Extract the Seller's GSTIN if visible into "supplierGstin".
3. Extract the Seller's phone/mobile into "supplierPhone".
4. Extract the Seller's city into "supplierCity" (e.g. "Surat").
5. Extract the Invoice Number / Bill No into "supplierInvoice" (e.g. "JC 88", "INV-1024").
6. Extract the Bill Date into "date" formatted as YYYY-MM-DD.
7. Read EVERY product row in the table into the "lines" array without omitting any rows:
   - "name": Clean, full product name / description.
   - "qty": Quantity (number). Default 1 if missing.
   - "rate": Unit purchase price / buy rate (number).
   - "mrp": Maximum Retail Price (number). If MRP is not given, set mrp = rate or calculate reasonable MRP.
   - "gst": Combined GST % (e.g. 18 if 9% CGST + 9% SGST, or 5, 12, 28, 0).
   - "total": Row total amount (number).
8. Calculate or extract "grandTotal".

Return strictly valid JSON only:
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
  "grandTotal": 100
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
              text: 'Please scan and extract every single product row and invoice details from this purchase bill into JSON.',
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

    // Extract JSON substring
    const startIdx = rawContent.indexOf('{');
    const endIdx = rawContent.lastIndexOf('}');

    if (startIdx === -1 || endIdx === -1) {
      return NextResponse.json(
        { success: false, error: 'AI could not find structured invoice data in this image. Please ensure the bill is well-lit and clearly visible.' },
        { status: 422 }
      );
    }

    const jsonString = rawContent.slice(startIdx, endIdx + 1);
    const parsedData = JSON.parse(jsonString);

    // Sanitize lines
    const sanitizedLines = (parsedData.lines || []).map((l: any) => ({
      name: String(l.name || 'Product').trim(),
      qty: Math.max(1, Number(l.qty) || 1),
      rate: Math.max(0, Number(l.rate) || 0),
      mrp: Number(l.mrp) > 0 ? Number(l.mrp) : Number(l.rate) || 0,
      gst: l.gst !== undefined ? Number(l.gst) : 18,
      total: Number(l.total) || (Number(l.qty) || 1) * (Number(l.rate) || 0),
    }));

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
