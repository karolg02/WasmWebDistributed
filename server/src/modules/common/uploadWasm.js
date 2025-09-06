const fs = require('fs');
const path = require('path');
const { sanitizeJsIdentifier } = require("../utils/utils");

function uploadWasmHandler(activeCustomFunctions, io, tempDir) {
    return (req, res) => {
        try {
            const { clientId, method } = req.body;

            if (!clientId) {
                return res.json({
                    success: false,
                    error: "Brak clientId w żądaniu"
                });
            }

            const sanitizedId = sanitizeJsIdentifier(clientId);

            const wasmTempFile = req.files['wasmFile'][0];
            const loaderTempFile = req.files['loaderFile'][0];

            const wasmPath = path.join(tempDir, `${sanitizedId}.wasm`);
            const loaderPath = path.join(tempDir, `${sanitizedId}.js`);

            try {
                fs.renameSync(wasmTempFile.path, wasmPath);
                fs.renameSync(loaderTempFile.path, loaderPath);
            } catch (renameError) {
                return res.json({
                    success: false,
                    error: "Błąd podczas zapisywania plików"
                });
            }

            activeCustomFunctions.set(clientId, {
                active: true,
                sanitizedId: sanitizedId
            });

            res.json({
                success: true,
                message: "Pliki przesłane pomyślnie",
                sanitizedId: sanitizedId
            });

        } catch (error) {
            res.json({
                success: false,
                error: "Błąd serwera podczas przetwarzania plików"
            });
        }
    };
}

module.exports = { uploadWasmHandler };