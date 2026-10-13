// app/api/whatsapp/ai-replies/route.ts
// AI Smart Reply Generator based on last messages, customer name, time of day & language

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getTimeOfDayGreeting(lang: 'gu' | 'hi' | 'en'): string {
  const hour = new Date().getHours();
  if (lang === 'gu') {
    if (hour < 12) return 'શુભ સવાર';
    if (hour < 17) return 'શુભ બપોર';
    return 'શુભ સાંજ';
  }
  if (lang === 'hi') {
    if (hour < 12) return 'सुप्रभात';
    if (hour < 17) return 'शुभ दोपहर';
    return 'शुभ संध्या';
  }
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function detectLanguage(texts: string[]): 'gu' | 'hi' | 'en' {
  const combined = texts.join(' ').toLowerCase();
  // Gujarati script or romanized Gujarati
  if (/[\u0A80-\u0AFF]/.test(combined) || /\b(kem|cho|chho|su|tamare|havu|aavvu|aavo)\b/.test(combined)) {
    return 'gu';
  }
  // Hindi script or romanized Hindi
  if (/[\u0900-\u097F]/.test(combined) || /\b(kya|kaise|ho|aap|hum|karna|chahiye)\b/.test(combined)) {
    return 'hi';
  }
  return 'en';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const customerName = (body.customerName || 'Client').trim();
    const lastMessages: any[] = Array.isArray(body.lastMessages) ? body.lastMessages.slice(-10) : [];

    const textList = lastMessages.map((m) => (typeof m === 'string' ? m : m.body || m.text || ''));
    const lastUserMessage = [...textList].reverse().find((t) => t.trim().length > 0) || '';
    const lang = detectLanguage([lastUserMessage, ...textList]);
    const tod = getTimeOfDayGreeting(lang);

    // Rule-based high-quality responses tailored to customer inquiry
    let suggestions: string[] = [];
    const lowerLast = lastUserMessage.toLowerCase();

    if (lang === 'gu') {
      if (lowerLast.includes('rate') || lowerLast.includes('ભાવ') || lowerLast.includes('price')) {
        suggestions = [
          `નમસ્તે ${customerName}! અમારા રેટ કાર્ડ અને સ્પેશિયલ ઓફર્સ મોકલી રહ્યા છીએ.`,
          `ચોક્કસ ${customerName}! કઈ સર્વિસ (હેર સ્પા, ફેશિયલ કે બ્રાઇડલ) નો ભાવ જાણવો છે?`,
          `${tod} ${customerName}! આ અઠવાડિયે હેર સ્પા અને હાઈડ્રા ફેશિયલ પર ફ્લેટ 20% ઓફ છે.`,
        ];
      } else if (lowerLast.includes('book') || lowerLast.includes('appointment') || lowerLast.includes('સમય')) {
        suggestions = [
          `નમસ્તે ${customerName}! આજે તમે ક્યા સમયે અનુકૂળ છો? અમે સ્લોટ બુક કરી આપીએ.`,
          `ચોક્કસ ${customerName}! તમારી એપોઇન્ટમેન્ટ કન્ફર્મ કરવા કઈ સર્વિસ લેવી છે જણાવો.`,
          `${tod} ${customerName}! આજે સાંજે 4:00 PM અને 6:00 PM નો સ્લોટ ખાલી છે.`,
        ];
      } else {
        suggestions = [
          `નમસ્તે ${customerName}! શ્રી બ્યુટી સ્ટુડિયોમાં તમારું સ્વાગત છે, અમે તમારી શું મદદ કરી શકીએ?`,
          `${tod} ${customerName}! શું આજે સલૂન સર્વિસ કે એપોઇન્ટમેન્ટ માટે કોઈ વિગત જોઈએ છે?`,
          `હેલો ${customerName}! આશા છે આપ મજામાં હશો, જણાવો આજે આપના માટે શું કરી શકીએ?`,
        ];
      }
    } else if (lang === 'hi') {
      if (lowerLast.includes('price') || lowerLast.includes('kitna') || lowerLast.includes('rate')) {
        suggestions = [
          `नमस्ते ${customerName}! हमारी सभी सर्विसेज का रेट कार्ड आपको भेज रहे हैं।`,
          `ज़रूर ${customerName}! आप हेयर स्पा, हाइड्रा फेशियल या ब्राइडल पैकेज किस बारे में जानना चाहते हैं?`,
          `${tod} ${customerName}! इस हफ्ते सभी प्रीमियम फेशियल पर 20% की छूट चल रही है।`,
        ];
      } else {
        suggestions = [
          `नमस्ते ${customerName}! श्री ब्यूटी स्टूडियो में आपका स्वागत है, हम आपकी क्या मदद कर सकते हैं?`,
          `${tod} ${customerName}! क्या आप आज के लिए अपॉइंटमेंट बुक करना चाहते हैं?`,
          `हेलो ${customerName}! आशा है आप ठीक हैं, बताइए आज क्या सेवा कर सकते हैं?`,
        ];
      }
    } else {
      // English
      if (lowerLast.includes('price') || lowerLast.includes('rate') || lowerLast.includes('cost')) {
        suggestions = [
          `Hello ${customerName}! Sending our full digital service menu and rate card.`,
          `Hi ${customerName}! Which service would you like rates for (Hair Spa, Hydra Facial, or Bridal)?`,
          `${tod} ${customerName}! We have an ongoing 20% discount on all premium salon packages this week!`,
        ];
      } else if (lowerLast.includes('appointment') || lowerLast.includes('book') || lowerLast.includes('timing')) {
        suggestions = [
          `Hello ${customerName}! We have open slots available today at 4:00 PM and 6:00 PM. What time suits you?`,
          `Hi ${customerName}! Which service would you like to book an appointment for?`,
          `${tod} ${customerName}! I would be happy to confirm your appointment slot right now.`,
        ];
      } else {
        suggestions = [
          `Hello ${customerName}, how can we help you today?`,
          `${tod} ${customerName}! What can we do for you at Shree Beauty Studio?`,
          `Hi ${customerName}, hope you're doing well! How can we assist you today?`,
        ];
      }
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 3),
      detectedLanguage: lang,
      customerName,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      suggestions: [
        'Hello, how can we help you today?',
        'Good afternoon! What can we do for you?',
        'Hi, hope you are doing well!',
      ],
      error: err?.message,
    });
  }
}
