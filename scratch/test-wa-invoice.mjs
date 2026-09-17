// scratch/test-wa-invoice.mjs
import fs from 'fs';

const TOKEN = 'EAAPI3xAR034BSeVdf1LvJTdzKWPjbWKwVCaeF9v5alFqA2TIHvoe5QqdsE2N0Ei1Esz6bq0rydUm2RUAZC9EfhgtKni7P0QXukl0XDxtIcjhgZBM5VTR8JMd6WwbujDwT0vD0YmpEvYjE5xLBFQDPxXBlkmeoZBZBqTirrZB3lRtFoRK9TyLk0fHKR3SwbgZDZD';
const PHONE_ID = '1321601881035337';
const TO = '919601014899';

async function testSend() {
  console.log(`Sending WhatsApp Invoice message to +${TO}...`);
  
  const textMsg = `✨ *SHREE BEAUTY STUDIO — Official Invoice #INV-202609-001* ✨\n\nDear Customer,\nThank you for choosing Shree Beauty Studio! 💖\n\n📄 *Service Summary:*\n• Bridal HD Makeup & Hairstyle: ₹15,000\n• Herbal Deep Glow Facial: ₹850\n────────────────────────\n*Total Amount:* ₹15,850\n*Paid:* ₹15,850 (Online/UPI)\n*Balance Due:* ₹0\n\n📍 22, Radhika Society, Opp. Cancer Hospital, Katargam, Surat\n📞 +91 97732 40010\n\nHave a wonderful and glowing day! ✨🙏`;

  const res = await fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: TO,
      type: 'text',
      text: {
        preview_url: false,
        body: textMsg
      }
    })
  });

  const data = await res.json();
  console.log('Meta API Response Status:', res.status);
  console.log('Meta API Response Data:', JSON.stringify(data, null, 2));
}

testSend().catch(console.error);
