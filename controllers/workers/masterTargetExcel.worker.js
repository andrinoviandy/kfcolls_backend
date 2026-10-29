
const { parentPort, workerData } = require("worker_threads");
const XLSX = require("xlsx");

const BATCH_SIZE = workerData?.batchSize || 1000;

function sendAndWait(message) {
    return new Promise((resolve, reject) => {
        const onMessage = (response) => {
            if (response?.type === "ACK") {
                cleanup();
                resolve();
            } else if (response?.type === "CANCEL") {
                cleanup();
                reject(new Error("Proses Excel dibatalkan."));
            }
        };

        const cleanup = () => {
            parentPort.off("message", onMessage);
        };

        parentPort.on("message", onMessage);
        parentPort.postMessage(message);
    });
}

async function main() {
    try {
        if (!workerData?.filePath) {
            throw new Error("Path file Excel tidak ditemukan.");
        }

        console.log("[MASTER TARGET WORKER] Mulai:", {
            filePath: workerData.filePath,
            waktu: new Date().toISOString(),
            memory: process.memoryUsage(),
        });

        const startTime = Date.now();

        const workbook = XLSX.readFile(workerData.filePath, {
            cellDates: true,
            dense: false,
        });

        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            throw new Error("File Excel tidak memiliki sheet.");
        }

        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet || !worksheet["!ref"]) {
            throw new Error("File Excel tidak memiliki data.");
        }

        const range = XLSX.utils.decode_range(worksheet["!ref"]);

        console.log("[MASTER TARGET WORKER] Range Excel:", {
            ref: worksheet["!ref"],
            startRow: range.s.r,
            endRow: range.e.r,
            startColumn: range.s.c,
            endColumn: range.e.c,
            totalBarisExcel: range.e.r - range.s.r,
        });
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

            if (cell?.f) {
                console.log("[MASTER TARGET WORKER] Formula:", {
                    excelRow: rowIndex + 1,
                    formula: cell.f,
                    value: cell.v,
                    type: cell.t,
                });
            }
            headers.push(cell?.v ?? "");
        }

        if (
            !headers.some(
                (header) => String(header).trim() !== ""
            )
        ) {
            throw new Error("File Excel tidak memiliki header.");
        }

        console.log("[MASTER TARGET WORKER] Header:", headers);

        // Minta service memvalidasi header sebelum mengirim data.
        await sendAndWait({
            type: "HEADERS",
            headers,
        });

        let batch = [];

        for (
            let rowIndex = range.s.r + 1;
            rowIndex <= range.e.r;
            rowIndex++
        ) {
            const values = [];

            for (
                let col = range.s.c;
                col <= range.e.c;
                col++
            ) {
                const address = XLSX.utils.encode_cell({
                    r: rowIndex,
                    c: col,
                });

                const cell = worksheet[address];

                if (cell?.f) {
                    console.log("[MASTER TARGET WORKER] Formula:", {
                        excelRow: rowIndex + 1,
                        formula: cell.f,
                        value: cell.v,
                        type: cell.t,
                    });
                }
                values.push(cell?.v ?? "");
            }

            console.log("[MASTER TARGET WORKER] Data baris:", {
                excelRow: rowIndex + 1,
                values,
            });
            // Lewati baris kosong.
            if (
                !values.some(
                    (value) => String(value ?? "").trim() !== ""
                )
            ) {
                continue;
            }

            batch.push({
                values,
                excelRow: rowIndex + 1,
            });

            if (batch.length >= BATCH_SIZE) {
                await sendAndWait({
                    type: "BATCH",
                    rows: batch,
                });

                batch = [];
            }
        }

        // Kirim sisa baris yang belum mencapai ukuran batch.
        if (batch.length > 0) {
            await sendAndWait({
                type: "BATCH",
                rows: batch,
            });
        }

        console.log("[MASTER TARGET WORKER] Parsing selesai:", {
            durationSeconds: (
                (Date.now() - startTime) /
                1000
            ).toFixed(2),
            memory: process.memoryUsage(),
        });

        parentPort.postMessage({
            type: "DONE",
        });
    } catch (error) {
        console.error("[MASTER TARGET WORKER] Error:", {
            message: error.message,
            stack: error.stack,
        });

        parentPort.postMessage({
            type: "ERROR",
            message:
                error.message ||
                "Gagal membaca file Excel Master Target.",
            stack: error.stack,
        });
    }
}

main();
