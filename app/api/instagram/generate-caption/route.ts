import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      category = 'bridal',
      language = 'hinglish',
      clientName = '',
      specialOffer = '',
      salonName = 'Shree Beauty Studio',
      phone = '9824183769',
      address = '22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat, Gujarat 395004',
      vibe = '',
      randomSeed = Date.now(),
    } = body;

    const groqKey = process.env.GROQ_API_KEY || '';
    const nvidiaKey = process.env.NVIDIA_NIM_API_KEY || '';

    const namePrompt = clientName?.trim() ? `Client/Bride Name: "${clientName.trim()}"` : 'General client makeover';
    const offerPrompt = specialOffer?.trim() ? `Special Promo: "${specialOffer.trim()}"` : 'No special promo';

    const systemPrompt = `You are a viral Instagram Reel copywriter for "${salonName}" in Katargam, Surat.
Write a 100% UNIQUE, fresh, non-repeating, emotional & luxurious Instagram Reel/Post caption.
Language: ${language === 'gujarati' ? 'Pure Gujarati (ગુજરાતી)' : language === 'hinglish' ? 'Natural Hinglish (Hindi/English blend)' : 'Luxury English'}.

Format:
1. Viral Opening Hook with emojis (POV, emotional, or royal).
2. Engaging descriptive transformation body.
3. Special offer (if provided).
4. Studio address (${address}), Phone (${phone}), and Booking Link (https://shreebeauty.studio/book).
5. Divider line (──────────).
6. 10-15 trending Surat & Bridal hashtags.
Return ONLY the raw caption text without code blocks.`;

    const userPrompt = `Category: ${category}
${namePrompt}
${offerPrompt}
Seed/Angle: ${vibe || 'Creative unique angle'} #${randomSeed}`;

    // 1. Try NVIDIA NIM (llama-3.2-11b-vision-instruct)
    if (nvidiaKey && !nvidiaKey.startsWith('PASTE_')) {
      try {
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${nvidiaKey}`,
          },
          body: JSON.stringify({
            model: 'meta/llama-3.2-11b-vision-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.9,
            max_tokens: 600,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text) {
            return NextResponse.json({
              success: true,
              caption: text.replace(/^```[a-z]*\n|```$/g, '').trim(),
              provider: 'NVIDIA NIM Llama-3.2',
            });
          }
        } else {
          const err = await res.text();
          console.error('NVIDIA NIM error:', err);
        }
      } catch (err: any) {
        console.error('NVIDIA fetch error:', err);
      }
    }

    // 2. Try Groq (qwen/qwen-2.5-32b-instruct or llama-3.3-70b-versatile)
    if (groqKey && !groqKey.startsWith('PASTE_')) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.9,
            max_tokens: 600,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text) {
            return NextResponse.json({
              success: true,
              caption: text.replace(/^```[a-z]*\n|```$/g, '').trim(),
              provider: 'Groq Llama-3.3',
            });
          }
        } else {
          const err = await res.text();
          console.error('Groq error:', err);
        }
      } catch (err: any) {
        console.error('Groq fetch error:', err);
      }
    }

    return NextResponse.json({ success: false, error: 'AI provider error' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
