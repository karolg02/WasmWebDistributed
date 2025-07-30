const fs = require('fs');
const path = require('path');
const { sanitizeJsIdentifier } = require("../utils/utils");

function deleteClientFiles(clientId, tempDir) {
    const sanitizedId = sanitizeJsIdentifier(clientId);
    const wasmFile = path.join(tempDir, `${sanitizedId}.wasm`);
    const loaderFile = path.join(tempDir, `${sanitizedId}.js`);

    if (fs.existsSync(wasmFile) && fs.existsSync(loaderFile)) {
        fs.unlinkSync(wasmFile);
        fs.unlinkSync(loaderFile);
    }
}

module.exports = { deleteClientFiles };