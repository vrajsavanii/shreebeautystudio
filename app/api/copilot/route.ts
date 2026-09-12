// app/api/copilot/route.ts
//
// AI Copilot & Voice Assistant API Route for Shree Beauty Studio Management System
// Multi-Provider Fallback Chain:
// 1. Groq API (qwen/qwen-2.5-32b-instruct / llama-3.3-70b-versatile)
// 2. NVIDIA NIM API (meta/llama-3.2-11b-vision-instruct)
// 3. Google Gemini API (gemini-2.0-flash)
// 4. Built-in Conversational Rule & Slot-Filling Engine (Offline / Zero-Key Fallback)

import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `
તમે "શ્રી બ્યુટી સ્ટુડિયો" (કતારગામ, સુરત) ના ઇન્ટેલિજન્ટ AI વોઇસ અને સલૂન ઓપરેટર આસિસ્ટન્ટ છો.
તમારું કામ સલૂન ઓનર/રિસેપ્શનિસ્ટ સાથે ગુજરાતી, હિન્દી અથવા અંગ્રેજીમાં સહજ, નમ્ર અને મિત્રતાભર્યો બે-તરફી સંવાદ (two-way human-like interaction) કરવાનો છે અને સોફ્ટવેરમાં જરૂરી કાર્યો (actions) એક્ઝિક્યુટ કરવાનો છે.

મહત્વપૂર્ણ નિયમો:
1. હંમેશા શુદ્ધ અને સુંદર ગુજરાતી ભાષામાં ("નમસ્તે!", "ચોક્કસ!", "હાજી!", "હું કરી દઉં છું") જવાબ આપો.
2. કાઉન્ટર પ્રશ્ન પૂછો (Ask Counter Questions): જો યુઝર કોઈ કામ કરવા કહે પણ જરૂરી વિગતો અધૂરી હોય (જેમ કે માત્ર "બિલ બનાવો" કે "એપોઇન્ટમેન્ટ બુક કરો" કહે), તો અનુમાન ન લગાવો. "action": "NONE" રાખીને નમ્રતાથી વિગતો પૂછો (જેમ કે: "ચોક્કસ! કોના નામે એપોઇન્ટમેન્ટ બુક કરવી છે અને કઈ સર્વિસ લેવી છે?").
3. જ્યારે વિગતો પૂરી હોય, ત્યારે તરત જ યોગ્ય Action JSON સાથે જવાબ આપો.

ઉપલબ્ધ Actions:
- CREATE_APPOINTMENT: payload = { customer, mobile, service, date (YYYY-MM-DD), time (HH:MM AM/PM), staff, advance, notes }
- UPDATE_APPOINTMENT_STATUS: payload = { customer, status ("Confirmed"|"Cancelled"|"Completed"), date, time }
- CREATE_INVOICE: payload = { customer, mobile, lines: [{ name, price, qty }], paymentMode ("Cash"|"GPay UPI"|"PhonePe UPI"|"Card"), discount, paid }
- ADD_CUSTOMER: payload = { name, mobile, address, birthday, anniversary, openingBalance }
- RECORD_EXPENSE: payload = { category ("Rent"|"Electricity & Utilities"|"Staff Tea & Refreshments"|"Housekeeping & Cleaning"|"Marketing & Ads"|"Salon Maintenance"|"Staff Bonus / Incentives"|"Other Expense"), amount, mode ("Cash"|"GPay UPI"), notes }
- ADD_INVENTORY: payload = { name, category, brand, stock, buy, sell, barcode }
- UPDATE_STOCK: payload = { productName, qty, type ("Add"|"Reduce") }
- CREATE_BRIDAL_BOOKING: payload = { name, mobile, weddingDate, sagaiDate, packageName, price, advance, venue }
- UPDATE_BRIDAL_PRICE: payload = { packageName, price }
- ADD_SERVICE: payload = { name, price, duration, category }
- UPDATE_SERVICE_PRICE: payload = { serviceName, price }
- SEND_WHATSAPP_PDF: payload = { recipientMobile, recipientName, documentType ("bridal_rate_card"|"invoice") }
- NAVIGATE: payload = { path ("/admin/billing"|"/admin/appointments"|"/admin/customers"|"/admin/inventory"|"/admin/bridal"|"/admin/expenses"|"/admin/reports"|"/admin/services"|"/admin/settings"|"/admin/whatsapp") }
- TRIGGER_CLOUD_SYNC: payload = {}
- NONE: payload = {}

હંમેશા માત્ર RAW JSON માં જ જવાબ આપો (કોઈ વધારાનું માર્કડાઉન નહીં):
{
  "replyText": "નમસ્તે! પૂજા પટેલ માટે આજે સાંજે 4 વાગ્યે હેર કટ ની એપોઇન્ટમેન્ટ બુક કરી દીધી છે.",
  "action": "CREATE_APPOINTMENT",
  "payload": { ... }
}
`;

// Helper: Clean JSON response from LLM markdown codeblocks
function cleanAndParseJSON(text: string) {
  const cleaned = text.replace(/```json\s*|```/g, '').trim();
  return JSON.parse(cleaned);
}

// Helper 1: Try Groq API
async function callGroq(
  prompt: string,
  contextSummary: string,
  history: Array<{ role: string; content: string }>,
  apiKey: string
) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const messages: any[] = [{ role: 'system', content: `${SYSTEM_PROMPT}\n\nSALON SYSTEM REAL-TIME DATA:\n${contextSummary}` }];

  // Add conversation history
  if (Array.isArray(history) && history.length > 0) {
    history.slice(-6).forEach((h) => {
      messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content });
    });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages,
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 100)}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || '';
  const parsed = cleanAndParseJSON(text);
  return { json: parsed, provider: 'Groq (Qwen-3.8-27B)' };
}

// Helper 2: Try NVIDIA NIM API
async function callNvidiaNim(
  prompt: string,
  contextSummary: string,
  history: Array<{ role: string; content: string }>,
  apiKey: string
) {
  const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
  const messages: any[] = [{ role: 'system', content: `${SYSTEM_PROMPT}\n\nSALON SYSTEM REAL-TIME DATA:\n${contextSummary}` }];

  if (Array.isArray(history) && history.length > 0) {
    history.slice(-6).forEach((h) => {
      messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content });
    });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.2-11b-vision-instruct',
      messages,
      temperature: 0.3,
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
  return { json: parsed, provider: 'NVIDIA NIM (Llama-3.2-11B)' };
}

// Helper 3: Try Google Gemini API
async function callGemini(
  prompt: string,
  contextSummary: string,
  history: Array<{ role: string; content: string }>,
  apiKey: string
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const contents: any[] = [
    {
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\nSALON SYSTEM REAL-TIME DATA:\n${contextSummary}` }],
    },
    {
      role: 'model',
      parts: [{ text: JSON.stringify({ replyText: 'નમસ્તે! હું તમારી શું સેવા કરી શકું?', action: 'NONE', payload: {} }) }],
    },
  ];

  if (Array.isArray(history) && history.length > 0) {
    history.slice(-6).forEach((h) => {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      });
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
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

// Helper 4: Built-in Conversational Rule & Slot-Filling Engine
function parseRuleEngine(prompt: string, history: Array<{ role: string; content: string }> = []) {
  const lower = prompt.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  // Check last question asked by assistant if waiting for answer
  const lastAssistantMsg = [...history].reverse().find((h) => h.role === 'assistant')?.content.toLowerCase() || '';

  // 1. Navigation
  if (lower.includes('billing') || lower.includes('pos') || lower.includes('bill page') || lower.includes('બિલિંગ પેજ')) {
    return {
      json: { replyText: 'હાજી! બિલિંગ (POS) પેજ ઓપન કરી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/admin/billing' } },
      provider: 'Built-in Voice Rule Engine',
    };
  }
  if (lower.includes('appointment') || lower.includes('એપોઇન્ટમેન્ટ પેજ')) {
    return {
      json: { replyText: 'હાજી! એપોઇન્ટમેન્ટ્સ મેનેજમેન્ટ પેજ ખોલી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/admin/appointments' } },
      provider: 'Built-in Voice Rule Engine',
    };
  }
  if (lower.includes('bridal') || lower.includes('બ્રાઇડલ')) {
    return {
      json: { replyText: 'હાજી! બ્રાઇડલ અને ઇવેન્ટ સ્ટુડિયો પેજ ખોલી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/admin/bridal' } },
      provider: 'Built-in Voice Rule Engine',
    };
  }
  if (lower.includes('inventory') || lower.includes('stock') || lower.includes('સ્ટોક') || lower.includes('સામાન')) {
    return {
      json: { replyText: 'હાજી! ઇન્વેન્ટરી અને સ્ટોક લિસ્ટ ખોલી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/admin/inventory' } },
      provider: 'Built-in Voice Rule Engine',
    };
  }
  if (lower.includes('expense') || lower.includes('ખર્ચ') || lower.includes('ખર્ચો')) {
    // If asking to open page
    if (lower.includes('page') || lower.includes('પેજ') || lower.includes('બતાવો') || lower.includes('ખોલો')) {
      return {
        json: { replyText: 'હાજી! ખર્ચ અને પેમેન્ટ્સ પેજ ખોલી રહ્યું છું.', action: 'NAVIGATE', payload: { path: '/admin/expenses' } },
        provider: 'Built-in Voice Rule Engine',
      };
    }
    // If recording expense
    const amtMatch = prompt.match(/\d+/);
    if (amtMatch) {
      const amount = Number(amtMatch[0]);
      let category = 'Staff Tea & Refreshments';
      if (lower.includes('light') || lower.includes('લાઈટ') || lower.includes('electric')) category = 'Electricity & Utilities';
      if (lower.includes('rent') || lower.includes('ભાડું')) category = 'Rent';
      return {
        json: {
          replyText: `હાજી! ${category} માટે ₹${amount} નો ખર્ચ નોંધી લીધો છે.`,
          action: 'RECORD_EXPENSE',
          payload: { category, amount, mode: 'Cash', notes: prompt },
        },
        provider: 'Built-in Voice Rule Engine',
      };
    } else {
      return {
        json: {
          replyText: 'ખર્ચ નોંધવા માટે કૃપા કરીને રકમ (રૂપિયા) અને ખર્ચની વિગત જણાવો, જેમ કે "ચા નાસ્તો 150 રૂપિયા".',
          action: 'NONE',
          payload: {},
        },
        provider: 'Built-in Voice Rule Engine',
      };
    }
  }

  // 2. Appointment Booking Slot-Filling & Counter-Questions
  if (lower.includes('book') || lower.includes('appointment') || lower.includes('એપોઇન્ટમેન્ટ')) {
    const mobMatch = prompt.match(/[6-9]\d{9}/);
    const hasName = prompt.match(/[A-Z][a-z]+/);
    const customer = hasName ? hasName[0] : (prompt.split(' ')[0] || '');

    if (customer.length > 2 && (lower.includes('hair') || lower.includes('facial') || lower.includes('મેકઅપ') || lower.includes('સ્પા'))) {
      return {
        json: {
          replyText: `ચોક્કસ! ${customer} માટે એપોઇન્ટમેન્ટ બુક કરી દીધી છે.`,
          action: 'CREATE_APPOINTMENT',
          payload: {
            customer,
            mobile: mobMatch ? mobMatch[0] : '9898012345',
            service: lower.includes('facial') ? 'Hydra Facial' : 'Hair Cut & Style',
            date: today,
            time: '04:00 PM',
          },
        },
        provider: 'Built-in Voice Rule Engine',
      };
    } else {
      return {
        json: {
          replyText: 'ચોક્કસ! કોના નામે એપોઇન્ટમેન્ટ બુક કરવી છે અને કઈ સર્વિસ લેવી છે તે જણાવો.',
          action: 'NONE',
          payload: {},
        },
        provider: 'Built-in Voice Rule Engine',
      };
    }
  }

  // 3. Billing & Counter-Questions
  if (lower.includes('bill') || lower.includes('બિલ')) {
    const amtMatch = prompt.match(/\d+/);
    if (amtMatch) {
      const price = Number(amtMatch[0]);
      return {
        json: {
          replyText: `હાજી! ₹${price} નું નવું બિલ બનાવી દીધું છે.`,
          action: 'CREATE_INVOICE',
          payload: {
            customer: 'Walk-in Client',
            mobile: '9898012345',
            lines: [{ name: 'Salon Service', price, qty: 1 }],
            paymentMode: 'GPay UPI',
          },
        },
        provider: 'Built-in Voice Rule Engine',
      };
    } else {
      return {
        json: {
          replyText: 'ચોક્કસ! કોના નામે બિલ બનાવવું છે અને કઈ સર્વિસ કે પ્રોડક્ટ ઉમેરવી છે?',
          action: 'NONE',
          payload: {},
        },
        provider: 'Built-in Voice Rule Engine',
      };
    }
  }

  // 4. Default Interactive Response
  return {
    json: {
      replyText: 'નમસ્તે! હું શ્રી બ્યુટી સ્ટુડિયોનો AI આસિસ્ટન્ટ છું. તમે મને એપોઇન્ટમેન્ટ બુક કરવા, બિલ બનાવવા, સ્ટોક તપાસવા કે ખર્ચ નોંધવા માટે કંઈપણ કહી શકો છો!',
      action: 'NONE',
      payload: {},
    },
    provider: 'Built-in Voice Rule Engine',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, contextSummary, history } = body;

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
        result = await callGroq(prompt, contextSummary || '', history || [], groqKey);
      } catch (err: any) {
        errors.push(`Groq Error: ${err?.message}`);
      }
    }

    // Attempt 2: NVIDIA NIM API
    if (!result && nvidiaKey && !nvidiaKey.startsWith('PASTE_')) {
      try {
        result = await callNvidiaNim(prompt, contextSummary || '', history || [], nvidiaKey);
      } catch (err: any) {
        errors.push(`NVIDIA NIM Error: ${err?.message}`);
      }
    }

    // Attempt 3: Google Gemini API
    if (!result && geminiKey && !geminiKey.startsWith('PASTE_')) {
      try {
        result = await callGemini(prompt, contextSummary || '', history || [], geminiKey);
      } catch (err: any) {
        errors.push(`Gemini Error: ${err?.message}`);
      }
    }

    // Attempt 4: Built-in Conversational Rule Engine
    if (!result) {
      result = parseRuleEngine(prompt, history || []);
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      replyText: result.json?.replyText || 'હાજી, વિગત પ્રોસેસ થઈ ગઈ છે.',
      action: result.json?.action || 'NONE',
      payload: result.json?.payload || {},
      errorsHandled: errors,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Error processing AI Voice Assistant task.',
      },
      { status: 500 }
    );
  }
}
