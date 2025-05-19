const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

function sanitizeJsIdentifier(id) {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

async function compileFunctionToWasm(clientId, functionCode, tempDir) {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log(`[CompilerService] Created temp directory: ${tempDir}`);
    }
    const sanitizedId = sanitizeJsIdentifier(clientId);
    const cppFilePath = path.join(tempDir, `${clientId}.cpp`);
    const cppTemplate = `
#include <stdio.h>
#include <cmath>
#include <stdlib.h>
#include <time.h>
#include <emscripten/emscripten.h>

extern "C" {
    // The user-defined function
    double funkcja(double x) {
        return ${functionCode};
    }

    EMSCRIPTEN_KEEPALIVE
    double add(double a, double b, double dx) {
        int N = ceil((b - a) / dx);
        double dx_adjust = (b - a) / N;
        int i;
        double calka = 0.0;
        for (i = 0; i < N; i++) {
            double x1 = a + i * dx_adjust;
            calka += 0.5 * dx_adjust * (funkcja(x1) + funkcja(x1 + dx_adjust));
        }
        return (calka);
    }
}
    `;

    fs.writeFileSync(cppFilePath, cppTemplate);

    try {
        const wasmFile = path.join(tempDir, `${clientId}.wasm`);
        const jsFile = path.join(tempDir, `${clientId}.js`);
        const compileCommand = `source ~/emsdk/emsdk_env.sh && emcc "${cppFilePath}" -o "${jsFile}" \
-sEXPORTED_FUNCTIONS=_add \
-sEXPORTED_RUNTIME_METHODS=ccall \
-sENVIRONMENT=web \
-sMODULARIZE=1 \
-sEXPORT_NAME="Module_${sanitizedId}"`;

        await execPromise(compileCommand);
        return {
            success: true,
            jsFile,
            wasmFile,
            sanitizedId
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function cleanupClientFiles(clientId, tempDir) {
    const filesToRemove = [
        path.join(tempDir, `${clientId}.cpp`),
        path.join(tempDir, `${clientId}.js`),
        path.join(tempDir, `${clientId}.wasm`)
    ];

    filesToRemove.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
}

module.exports = {
    compileFunctionToWasm,
    cleanupClientFiles
};