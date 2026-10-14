const { parentPort, workerData } = require('worker_threads');
const XLSX = require('xlsx');

const BATCH_SIZE = 1000;

/**
 * Kirim pesan ke service utama dan tunggu ACK.
 * Dengan mekanisme ini, Worker tidak mengirim batch berikutnya
 * sebelum batch sebelumnya selesai diproses.
 */
function sendAndWait(message) {
    return new Promise((resolve, reject) => {
        const onMessage = (response) => {
            if (response?.type === 'ACK') {
                cleanup();
                resolve();
            } else if (response?.type === 'CANCEL') {
                cleanup();
                reject(
                    new Error('Proses Excel dibatalkan.')
                );
            }
        };

        const cleanup = () => {
            parentPort.off('message', onMessage);
        };

        parentPort.on('message', onMessage);
        parentPort.postMessage(message);
    });
}

async function main() {
    try {
        if (!workerData?.filePath) {
            throw new Error(
                'Path file Excel tidak ditemukan.'
            );
        }

        console.log(
            '[EXCEL WORKER] Mulai membaca Excel',
            {
                filePath: workerData.filePath,
                waktu: new Date().toISOString(),
                memory: process.memoryUsage(),
            }
        );

        const start = Date.now();

        const workbook = XLSX.readFile(
            workerData.filePath,
            {
                cellDates: true,
                dense: false,
            }
        );

        console.log(
            '[EXCEL WORKER] Workbook berhasil dibaca',
            {
                durasiMs: Date.now() - start,
                jumlahSheet: workbook.SheetNames.length,
                sheetPertama: workbook.SheetNames[0],
                memory: process.memoryUsage(),
            }
        );

        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            throw new Error(
                'File Excel tidak memiliki sheet.'
            );
        }

        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet || !worksheet['!ref']) {
            throw new Error(
                'File Excel tidak memiliki data.'
            );
        }

        const range = XLSX.utils.decode_range(
            worksheet['!ref']
        );

        // Ambil header dari baris pertama worksheet.
        const headers = [];

        for (
            let col = range.s.c;
            col <= range.e.c;
            col++
        ) {
            const address = XLSX.utils.encode_cell({
                r: range.s.r,
                c: col,
            });

            const cell = worksheet[address];

            headers.push(cell?.v ?? '');
        }

        if (
            !headers.some(
                (header) =>
                    String(header).trim() !== ''
            )
        ) {
            throw new Error(
                'File Excel tidak memiliki header.'
            );
        }

        console.log(
            '[EXCEL WORKER] Header Excel:',
            headers
        );

        // Minta service utama memvalidasi seluruh header.
        await sendAndWait({
            type: 'HEADERS',
            headers,
        });

        let batch = [];

        for (
            let rowIndex = range.s.r + 1;
            rowIndex <= range.e.r;
            rowIndex++
        ) {
            const row = {};

            for (
                let col = range.s.c;
                col <= range.e.c;
                col++
            ) {
                const header =
                    headers[col - range.s.c];

                if (
                    header === null ||
                    header === undefined ||
                    String(header).trim() === ''
                ) {
                    continue;
                }

                const address = XLSX.utils.encode_cell({
                    r: rowIndex,
                    c: col,
                });

                const cell = worksheet[address];

                row[String(header)] = cell?.v ?? '';
            }

            batch.push({
                row,

                // Nomor baris Excel dimulai dari 1.
                excelRow: rowIndex + 1,
            });

            if (batch.length >= BATCH_SIZE) {
                await sendAndWait({
                    type: 'BATCH',
                    rows: batch,
                });

                batch = [];
            }
        }

        // Kirim batch terakhir jika belum mencapai 1.000 baris.
        if (batch.length > 0) {
            await sendAndWait({
                type: 'BATCH',
                rows: batch,
            });
        }

        console.log(
            '[EXCEL WORKER] Parsing selesai'
        );

        parentPort.postMessage({
            type: 'DONE',
        });
    } catch (error) {
        console.error(
            '[EXCEL WORKER] Error:',
            error
        );

        parentPort.postMessage({
            type: 'ERROR',
            message:
                error.message ||
                'Gagal membaca file Excel.',
            stack: error.stack,
        });
    }
}

main();