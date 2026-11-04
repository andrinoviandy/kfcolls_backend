const query = {}

query.getMasterIntegrasi = `
SELECT a.* FROM m_integrasi a WHERE a.entitas = ':entitas' AND a.modul = ':modul' AND a.method_akses = ':method' AND a.flag_aktif = 'Y';
`

query.checkConfig = `
SELECT COUNT(*) AS JML FROM m_integrasi a WHERE a.entitas = ':entitas' AND a.modul = ':modul' AND a.method_akses = ':method' AND a.flag_aktif = 'Y'`;

module.exports = query;
