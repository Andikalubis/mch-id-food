/* =========================================================
   DATA DUMMY — Cargo Monitoring
   Ganti isi CM.fetchData() dengan panggilan API sungguhan
   (format yang dikembalikan harus sama dengan CM.DATA).

   Kode status dokumen (field `docs`, satu huruf per dokumen):
     S = Selesai, P = Proses, M = Menunggu
   Tahap komoditas (field `stage`):
     0 = belum mulai, 1..3 = tahap ke-n sedang berjalan, 4 = semua selesai
   ========================================================= */
window.CM = window.CM || {};

CM.DEFAULT_FILTER = { pel: 'jkt', ter: 'jict', kap: 'mj', lay: 'import', ff: 'all' };

CM.LAYANAN = {
  import: {
    label: 'Import',
    verb: 'Bongkar',
    steps: [
      { key: 'bongkar', name: 'Bongkar', icon: 'i-ship' },
      { key: 'tumpuk',  name: 'Tumpuk',  icon: 'i-stack' },
      { key: 'keluar',  name: 'Keluar',  icon: 'i-truck' }
    ],
    docs: ['Permohonan', 'Perencanaan', 'Pendaftaran', 'EPB', 'BPIK', 'Penetapan', 'SPMK', 'Realisasi', 'Verifikasi', 'Pranota', 'Nota']
  },
  export: {
    label: 'Export',
    verb: 'Muat',
    steps: [
      { key: 'masuk',  name: 'Masuk',  icon: 'i-truck' },
      { key: 'tumpuk', name: 'Tumpuk', icon: 'i-stack' },
      { key: 'muat',   name: 'Muat',   icon: 'i-ship' }
    ],
    docs: ['Permohonan', 'Booking', 'PEB', 'NPE', 'Perencanaan', 'Stacking', 'Realisasi', 'Pranota', 'Nota']
  }
};

CM.DATA = {
  ports: [
    { id: 'jkt', name: 'Jakarta' },
    { id: 'sby', name: 'Surabaya' },
    { id: 'mks', name: 'Makassar' },
    { id: 'blw', name: 'Belawan' }
  ],

  terminals: [
    { id: 'jict',  port: 'jkt', name: 'Terminal Petikemas JICT' },
    { id: 'koja',  port: 'jkt', name: 'Terminal Petikemas Koja' },
    { id: 'npct1', port: 'jkt', name: 'NPCT1' },
    { id: 'tps',   port: 'sby', name: 'Terminal Petikemas Surabaya' },
    { id: 'ttl',   port: 'sby', name: 'Terminal Teluk Lamong' },
    { id: 'mnp',   port: 'mks', name: 'Makassar New Port' },
    { id: 'bict',  port: 'blw', name: 'Belawan Intl. Container Terminal' }
  ],

  vessels: [
    {
      id: 'mj', name: 'KM. Meratus Jaya', port: 'jkt', terminal: 'jict',
      status: { type: 'berthing', label: 'Berthing - Sedang Berkegiatan' },
      voyage: 'MJ-2504 IN / MJ-2504 OUT', asal: 'Surabaya (TPS)', tujuan: 'Jakarta (JICT)',
      pelayaran: 'Meratus Line', pkk: 'PKK/JKT/JICT/2504/0189', berth: 'JICT 01 / Berth 3',
      timeline: {
        arrival:   { est: '25 Apr 2025 07:30', akt: '25 Apr 2025 08:10' },
        berthing:  { est: '25 Apr 2025 10:00', akt: '25 Apr 2025 10:15' },
        departure: { est: '27 Apr 2025 18:00', akt: null }
      },
      ops: {
        import: { rencana: 50000, realisasi: 35400, mulai: '25 Apr 2025 13:00', selesai: '27 Apr 2025 09:00' },
        export: { rencana: 12000, realisasi: 1800,  mulai: '27 Apr 2025 10:00', selesai: '28 Apr 2025 06:00' }
      },
      commodities: [
        { id: 'mj-1', nama: 'Gula',           pbm: 'BGR Petikemas', owner: 'ID FOOD', ton: 5000, layanan: 'import', stage: 1, docs: 'SSSPSSPSPSP' },
        { id: 'mj-2', nama: 'Tepung Terigu',  pbm: 'PBM Bahari',    owner: 'ID FOOD', ton: 3500, layanan: 'import', stage: 1, docs: 'SSSSSSPMMMM' },
        { id: 'mj-3', nama: 'Minyak Goreng',  pbm: 'PBM Samudera',  owner: 'ID FOOD', ton: 2480, layanan: 'import', stage: 3, docs: 'SSSSSSSSPSP' },
        { id: 'mj-4', nama: 'Komoditas Lain', pbm: 'PBM Nusantara', owner: 'ID FOOD', ton: 1500, layanan: 'import', stage: 2, docs: 'SSSSSSSPMMM' },
        { id: 'mj-5', nama: 'Beras',          pbm: 'PBM Nusantara', owner: 'ID FOOD', ton: 1200, layanan: 'import', stage: 3, docs: 'SSSSSSSSSPM' },
        { id: 'mj-6', nama: 'Kopi',           pbm: 'PBM Bahari',    owner: 'ID FOOD', ton: 1200, layanan: 'export', stage: 1, docs: 'SSSSPMMMM' },
        { id: 'mj-7', nama: 'Kakao',          pbm: 'BGR Petikemas', owner: 'ID FOOD', ton: 800,  layanan: 'export', stage: 0, docs: 'SSPMMMMMM' }
      ]
    },
    {
      id: 'th', name: 'KM. Tanto Hawari', port: 'jkt', terminal: 'koja',
      status: { type: 'anchorage', label: 'Anchorage - Menunggu Sandar' },
      voyage: 'TH-0417 IN / TH-0417 OUT', asal: 'Makassar (MNP)', tujuan: 'Jakarta (Koja)',
      pelayaran: 'Tanto Intim Line', pkk: 'PKK/JKT/KOJA/2504/0211', berth: 'Anchorage Area B',
      timeline: {
        arrival:   { est: '26 Apr 2025 22:00', akt: '26 Apr 2025 23:40' },
        berthing:  { est: '27 Apr 2025 14:00', akt: null },
        departure: { est: '29 Apr 2025 23:00', akt: null }
      },
      ops: {
        import: { rencana: 28000, realisasi: 0, mulai: null, selesai: '29 Apr 2025 20:00' }
      },
      commodities: [
        { id: 'th-1', nama: 'Jagung',  pbm: 'PBM Samudera',  owner: 'ID FOOD', ton: 4200, layanan: 'import', stage: 0, docs: 'SSSPMMMMMMM' },
        { id: 'th-2', nama: 'Kedelai', pbm: 'BGR Petikemas', owner: 'ID FOOD', ton: 2800, layanan: 'import', stage: 0, docs: 'SSPMMMMMMMM' }
      ]
    },
    {
      id: 'kn', name: 'KM. Kendhaga Nusantara 7', port: 'jkt', terminal: 'npct1',
      status: { type: 'berthing', label: 'Berthing - Sedang Berkegiatan' },
      voyage: 'KN-0912 IN / KN-0912 OUT', asal: 'Belawan (BICT)', tujuan: 'Jakarta (NPCT1)',
      pelayaran: 'Pelni Logistik', pkk: 'PKK/JKT/NPCT/2504/0098', berth: 'NPCT1 / Berth 2',
      timeline: {
        arrival:   { est: '24 Apr 2025 19:00', akt: '24 Apr 2025 19:25' },
        berthing:  { est: '25 Apr 2025 06:00', akt: '25 Apr 2025 06:40' },
        departure: { est: '26 Apr 2025 22:00', akt: null }
      },
      ops: {
        import: { rencana: 36000, realisasi: 12600, mulai: '25 Apr 2025 08:00', selesai: '26 Apr 2025 12:00' },
        export: { rencana: 15000, realisasi: 0,     mulai: null,                selesai: '26 Apr 2025 20:00' }
      },
      commodities: [
        { id: 'kn-1', nama: 'Gula Rafinasi',  pbm: 'PBM Bahari',    owner: 'ID FOOD', ton: 6000, layanan: 'import', stage: 1, docs: 'SSSSSPPMMMM' },
        { id: 'kn-2', nama: 'Garam Industri', pbm: 'PBM Samudera',  owner: 'ID FOOD', ton: 2500, layanan: 'import', stage: 2, docs: 'SSSSSSSPMMM' },
        { id: 'kn-3', nama: 'Minyak Sawit',   pbm: 'BGR Petikemas', owner: 'ID FOOD', ton: 4000, layanan: 'export', stage: 1, docs: 'SSSPMMMMM' }
      ]
    },
    {
      id: 'sh', name: 'KM. Spil Hasanah', port: 'sby', terminal: 'tps',
      status: { type: 'departed', label: 'Departed - Kegiatan Selesai' },
      voyage: 'SH-1103 IN / SH-1103 OUT', asal: 'Jakarta (JICT)', tujuan: 'Surabaya (TPS)',
      pelayaran: 'SPIL', pkk: 'PKK/SBY/TPS/2504/0302', berth: 'TPS / Berth 5',
      timeline: {
        arrival:   { est: '20 Apr 2025 05:00', akt: '20 Apr 2025 05:20' },
        berthing:  { est: '20 Apr 2025 08:00', akt: '20 Apr 2025 08:05' },
        departure: { est: '22 Apr 2025 07:00', akt: '22 Apr 2025 07:45' }
      },
      ops: {
        import: { rencana: 42000, realisasi: 42000, mulai: '20 Apr 2025 09:00', selesai: '21 Apr 2025 23:00' }
      },
      commodities: [
        { id: 'sh-1', nama: 'Beras', pbm: 'BGR Petikemas', owner: 'ID FOOD', ton: 8000, layanan: 'import', stage: 4, docs: 'SSSSSSSSSSS' },
        { id: 'sh-2', nama: 'Gula',  pbm: 'PBM Nusantara', owner: 'ID FOOD', ton: 3000, layanan: 'import', stage: 4, docs: 'SSSSSSSSSSS' }
      ]
    },
    {
      id: 'ln', name: 'KM. Logistik Nusantara 3', port: 'sby', terminal: 'ttl',
      status: { type: 'berthing', label: 'Berthing - Sedang Berkegiatan' },
      voyage: 'LN-0305 IN / LN-0305 OUT', asal: 'Surabaya (TTL)', tujuan: 'Sorong',
      pelayaran: 'Pelni Logistik', pkk: 'PKK/SBY/TTL/2504/0144', berth: 'TTL / Berth 1',
      timeline: {
        arrival:   { est: '24 Apr 2025 12:00', akt: '24 Apr 2025 12:30' },
        berthing:  { est: '24 Apr 2025 15:00', akt: '24 Apr 2025 15:10' },
        departure: { est: '26 Apr 2025 10:00', akt: null }
      },
      ops: {
        export: { rencana: 22000, realisasi: 9800, mulai: '24 Apr 2025 16:00', selesai: '26 Apr 2025 06:00' }
      },
      commodities: [
        { id: 'ln-1', nama: 'Beras',         pbm: 'BGR Petikemas', owner: 'ID FOOD', ton: 3500, layanan: 'export', stage: 3, docs: 'SSSSSSPMM' },
        { id: 'ln-2', nama: 'Tepung Terigu', pbm: 'PBM Bahari',    owner: 'ID FOOD', ton: 2000, layanan: 'export', stage: 2, docs: 'SSSSSPMMM' }
      ]
    },
    {
      id: 'cj', name: 'KM. Caraka Jaya Niaga', port: 'mks', terminal: 'mnp',
      status: { type: 'berthing', label: 'Berthing - Sedang Berkegiatan' },
      voyage: 'CJ-0221 IN / CJ-0221 OUT', asal: 'Surabaya (TTL)', tujuan: 'Makassar (MNP)',
      pelayaran: 'Djakarta Lloyd', pkk: 'PKK/MKS/MNP/2504/0077', berth: 'MNP / Berth 1',
      timeline: {
        arrival:   { est: '25 Apr 2025 03:00', akt: '25 Apr 2025 03:15' },
        berthing:  { est: '25 Apr 2025 07:00', akt: '25 Apr 2025 07:30' },
        departure: { est: '27 Apr 2025 12:00', akt: null }
      },
      ops: {
        import: { rencana: 18000, realisasi: 4300, mulai: '25 Apr 2025 08:30', selesai: '26 Apr 2025 22:00' }
      },
      commodities: [
        { id: 'cj-1', nama: 'Jagung', pbm: 'PBM Samudera',  owner: 'ID FOOD', ton: 3000, layanan: 'import', stage: 1, docs: 'SSSSPSMMMMM' },
        { id: 'cj-2', nama: 'Gula',   pbm: 'BGR Petikemas', owner: 'ID FOOD', ton: 1800, layanan: 'import', stage: 1, docs: 'SSSPPMMMMMM' }
      ]
    }
  ]
};

/** Titik integrasi API: ganti isi fungsi ini dengan fetch('/api/...').then(r => r.json()) */
CM.fetchData = function () {
  return Promise.resolve(CM.DATA);
};
