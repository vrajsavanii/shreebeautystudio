// app/api/copilot/route.ts
//
// AI Copilot API Route for Shree Beauty Studio Management System
// Live Multi-Provider Smart Fallback Chain:
// 1. Groq API (qwen/qwen3.8-27b / groq/compound)
// 2. NVIDIA NIM API (meta/llama-3.2-11b-vision-instruct)
// 3. Google Gemini API (gemini-2.0-flash)
// 4. Built-in Natural Language Rule Engine (Offline / Zero-Key Fallback)

import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
You are the Intelligent AI Operator Copilot for "Shree Beauty Studio Management System".
Your job is to assist the salon receptionist/operator by understanding their instructions in English, Gujarati, or Hinglish, and translating them into software ACTIONS and friendly responses.

Current Date: ${new Date().toISOString().slice(0, 10)}
Available Routes: /billing, /customers, /services, /inventory, /bridal, /whatsapp, /settings, /expenses, /reports

You MUST respond ONLY with valid raw JSON (no conversational text outside the JSON):
{
  "replyText": "Friendly Gujarati/English response explaining what was done or answered",
  "action": "CREATE_APPOINTMENT | CREATE_INVOICE | ADD_INVENTORY | UPDATE_BRIDAL_PRICE | SEND_WHATSAPP_PDF | NAVIGATE | FILTER_CUSTOMERS | GET_REVENUE_STATS | NONE",
  "payload": { ... }
}

Action Specs:
1. CREATE_APPOINTMENT: payload = { customer, mobile, service, date (YYYY-MM-DD), time (HH:MM AM/PM), staff, notes }
2. CREATE_INVOICE: payload = { customer, mobile, lines: [{ name, price, qty }], paymentMode ("Cash"|"GPay UPI"|"PhonePe UPI"|"Card"), discount }
3. ADD_INVENTORY: payload = { name, category, brand, stock, buy, sell, barcode }
4. UPDATE_BRIDAL_PRICE: payload = { packageName, price, type ("Bridal Package"|"Siders Package") }
5. SEND_WHATSAPP_PDF: payload = { recipientMobile, recipientName, documentType ("invoice"|"bridal_rate_card"), invoiceNo }
6. NAVIGATE: payload = { path }
7. FILTER_CUSTOMERS: payload = { filterType ("vip"|"inactive"|"dues"|"birthdays") }
8. GET_REVENUE_STATS: payload = {}
9. NONE: payload = {}
`;

// Helper: Clean JSON response from LLM markdown codeblocks
function cleanAndParseJSON(text: string) {
  const cleaned = text.replace(/```json\s*|```/g, '').trim();
  return JSON.parse(cleaned);
}

// Helper 1: Try Groq API (qwen/qwen3.8-27b)
async function callGroq(prompt: string, contextSummary: string, apiKey: string) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `SALON SYSTEM CONTEXT:\n${contextSummary}\n\nUSER REQUEST: ${prompt}` },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 100)}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '';
  const parsed = cleanAndParseJSON(text);
  return { json: parsed, provider: 'Groq API (qwen-3.8-27b)' };
}

// Helper 2: Try NVIDIA NIM API (meta/llama-3.2-11b-vision-instruct)
async function callNvidiaNim(prompt: string, contextSummary: string, apiKey: string) {
  const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `SALON SYSTEM CONTEXT:\n${contextSummary}\n\nUSER REQUEST: ${prompt}` },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NVIDIA NIM HTTP ${res.status}: ${errText.slice(0, 100)}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '';
  const parsed = cleanAndParseJSON(text);
  return { json: parsed, provider: 'NVIDIA NIM API (llama-3.2-11b)' };
}

// Helper 3: Try Google Gemini API
async function callGemini(prompt: string, contextSummary: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            { text: `SALON SYSTEM CONTEXT:\n${contextSummary}\n\nUSER REQUEST: ${prompt}` },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 100)}`);
  }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = cleanAndParseJSON(text);
  return { json: parsed, provider: 'Google Gemini 2.0' };
}

// Helper 4: Built-in Rule Engine (Offline / Zero Key Fallback)
function parseRuleEngine(prompt: string, context: any) {
  const lower = prompt.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Navigation intent
  if (lower.includes('billing') || lower.includes('pos') || lower.includes('bill banavo') || lower.includes('bill page')) {
    return {
      json: { replyText: 'ઓપરેટર! બિલિંગ (POS) પેજ ઓપન કરી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/billing' } },
      provider: 'Built-in Rule Engine',
    };
  }
  if (lower.includes('bridal') || lower.includes('wedding') || lower.includes('siders') || lower.includes('rate card')) {
    return {
      json: { replyText: 'ઓપરેટર! બ્રાઇડલ & ઈવેન્ટ સ્ટુડિયો પેજ ઓપન કરી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/bridal' } },
      provider: 'Built-in Rule Engine',
    };
  }
  if (lower.includes('inventory') || lower.includes('stock') || lower.includes('product')) {
    return {
      json: { replyText: 'ઓપરેટર! ઈન્વેન્ટરી & સ્ટોક મેનેજમેન્ટ પેજ ઓપન કરી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/inventory' } },
      provider: 'Built-in Rule Engine',
    };
  }
  if (lower.includes('customer') || lower.includes('client')) {
    return {
      json: { replyText: 'ઓપરેટર! કસ્ટમર્સ લિસ્ટ પેજ ઓપન કરી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/customers' } },
      provider: 'Built-in Rule Engine',
    };
  }

  // 2. Appointment Booking intent
  if (lower.includes('book') || lower.includes('appointment') || lower.includes('એપોઇન્ટમેન્ટ')) {
    const mobMatch = prompt.match(/[6-9]\d{9}/);
    const mobile = mobMatch ? mobMatch[0] : '9898012345';
    let name = 'Valued Client';
    if (lower.includes('priya')) name = 'Priya Patel';
    else if (lower.includes('pooja')) name = 'Pooja Shah';

    return {
      json: {
        replyText: `ઓપરેટર! ${name} માટે એપોઇન્ટમેન્ટ બુક થઈ ગઈ છે.`,
        action: 'CREATE_APPOINTMENT',
        payload: {
          customer: name,
          mobile,
          service: lower.includes('facial') ? 'Hydra Deep Cleanse Facial' : 'Layer Cut & Blowdry',
          date: today,
          time: '04:00 PM',
          staff: 'Pooja',
        },
      },
      provider: 'Built-in Rule Engine',
    };
  }

  // 3. Invoice Generation intent
  if (lower.includes('create invoice') || lower.includes('make bill') || lower.includes('બિલ બનાવો')) {
    return {
      json: {
        replyText: 'ઓપરેટર! નવું બિલ જનરેટ કરી રહ્યું છું.',
        action: 'CREATE_INVOICE',
        payload: {
          customer: 'Walk-in Client',
          mobile: '9898012345',
          lines: [{ name: 'Hydra Deep Cleanse Facial', price: 2500, qty: 1 }],
          paymentMode: 'GPay UPI',
        },
      },
      provider: 'Built-in Rule Engine',
    };
  }

  // 4. WhatsApp Rate Card PDF intent
  if (lower.includes('send pdf') || lower.includes('whatsapp pdf') || lower.includes('rate card pdf')) {
    const mobMatch = prompt.match(/[6-9]\d{9}/);
    const mobile = mobMatch ? mobMatch[0] : '9898012345';
    return {
      json: {
        replyText: `ઓપરેટર! ${mobile} પર બ્રાઇડલ રેટ કાર્ડ PDF મોકલી રહ્યું છું.`,
        action: 'SEND_WHATSAPP_PDF',
        payload: {
          recipientMobile: mobile,
          recipientName: 'Client',
          documentType: 'bridal_rate_card',
        },
      },
      provider: 'Built-in Rule Engine',
    };
  }

  // 5. Default Response
  return {
    json: {
      replyText: 'ઓપરેટર! હું તમને એપોઇન્ટમેન્ટ બુકિંગ, બિલિંગ, ઈન્વેન્ટરી ઉમેરવામાં અને વોટ્સએપ PDF મોકલવામાં મદદ કરી શકું છું.',
      action: 'NONE',
      payload: {},
    },
    provider: 'Built-in Rule Engine',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, contextSummary } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'Prompt is required.' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY || '';
    const nvidiaKey = process.env.NVIDIA_NIM_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';

    let result: { json: any; provider: string } | null = null;
    const errors: string[] = [];

    // Attempt 1: Groq API
    if (groqKey && !groqKey.startsWith('PASTE_')) {
      try {
        result = await callGroq(prompt, contextSummary || '', groqKey);
      } catch (err: any) {
        errors.push(`Groq Error: ${err?.message}`);
      }
    }

    // Attempt 2: NVIDIA NIM API (Fallback if Groq unavailable)
    if (!result && nvidiaKey && !nvidiaKey.startsWith('PASTE_')) {
      try {
        result = await callNvidiaNim(prompt, contextSummary || '', nvidiaKey);
      } catch (err: any) {
        errors.push(`NVIDIA NIM Error: ${err?.message}`);
      }
    }

    // Attempt 3: Google Gemini API (Fallback if Groq & NVIDIA unavailable)
    if (!result && geminiKey && !geminiKey.startsWith('PASTE_')) {
      try {
        result = await callGemini(prompt, contextSummary || '', geminiKey);
      } catch (err: any) {
        errors.push(`Gemini Error: ${err?.message}`);
      }
    }

    // Attempt 4: Built-in Rule Engine (Zero key fallback)
    if (!result) {
      result = parseRuleEngine(prompt, contextSummary);
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      replyText: result.json?.replyText || 'Task processed successfully.',
      action: result.json?.action || 'NONE',
      payload: result.json?.payload || {},
      errorsHandled: errors,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Error processing AI Copilot task.',
      },
      { status: 500 }
    );
  }
}
