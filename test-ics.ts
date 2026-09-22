import { generateSingleBridalICS } from './lib/calendar';

const b = {
  id: 'bride123',
  name: 'SANDIP',
  weddingDate: '2026-09-27',
  weddingTime: '16:00',
  includeWedding: true,
  mandapDate: '2026-09-26',
  mandapTime: '10:00',
  includeMandap: true,
  musicDate: '2026-09-26',
  musicTime: '19:00',
  includeMusic: true
};

const ics = generateSingleBridalICS(b);
console.log(ics);
