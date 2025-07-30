const fs = require('fs');
const path = require('path');

async function getClientResult(clientId, results, activeCustomFunctions, tempDir) {
    const customFunction = activeCustomFunctions.get(clientId);
    if (!customFunction) {
        const sum = results.reduce((sum, val) => sum + val, 0);
        return `Suma: ${sum}, Liczba wyników: ${results.length}`;
    }

    try {
        const wasmPath = path.join(tempDir, `${customFunction.sanitizedId}.wasm`);
        const loaderPath = path.join(tempDir, `${customFunction.sanitizedId}.js`);

        if (!fs.existsSync(loaderPath)) {
            throw new Error(`Client loader not found: ${loaderPath}`);
        }
        if (!fs.existsSync(wasmPath)) {
            throw new Error(`Client WASM not found: ${wasmPath}`);
        }

        delete require.cache[require.resolve(loaderPath)];
        const ModuleFactory = require(loaderPath);

        const module = await ModuleFactory({
            locateFile: (filename) => {
                if (filename.endsWith('.wasm')) {
                    return wasmPath;
                }
                return filename;
            }
        });

        const resultsPtr = module._malloc(results.length * 8);
        if (!resultsPtr) {
            throw new Error('[Server] Failed to allocate memory for getting results in WASM');
        }

        try {
            for (let i = 0; i < results.length; i++) {
                const targetPtr = resultsPtr + i * 8;
                module.setValue(targetPtr, results[i], 'double');
            }

            let jsonResultPtr;
            if (typeof module._getResult === 'function') {
                jsonResultPtr = module._getResult(resultsPtr, results.length);
            } else if (typeof module.getResult === 'function') {
                jsonResultPtr = module.getResult(resultsPtr, results.length);
            } else {
                jsonResultPtr = module.ccall('_getResult', 'number', ['number', 'number'], [resultsPtr, results.length]);
            }

            if (!jsonResultPtr) {
                throw new Error('getResult returned null pointer');
            }

            let resultString;
            if (typeof module.UTF8ToString === 'function') {
                resultString = module.UTF8ToString(jsonResultPtr);
            } else if (typeof module.AsciiToString === 'function') {
                resultString = module.AsciiToString(jsonResultPtr);
            } else {
                let str = '';
                let i = 0;
                while (true) {
                    const charCode = module.getValue(jsonResultPtr + i, 'i8');
                    if (charCode === 0) break;
                    str += String.fromCharCode(charCode);
                    i++;
                }
                resultString = str;
            }

            module._free(resultsPtr);
            if (typeof module._freeResult === 'function') {
                module._freeResult(jsonResultPtr);
            } else {
                module._free(jsonResultPtr);
            }

            return resultString;

        } catch (execError) {
            module._free(resultsPtr);
            throw execError;
        }

    } catch (error) {
        const fallbackSum = results.reduce((sum, val) => sum + val, 0);
        return `Błąd! Suma fallback: ${fallbackSum}, Liczba: ${results.length}`;
    }
}

module.exports = { getClientResult };