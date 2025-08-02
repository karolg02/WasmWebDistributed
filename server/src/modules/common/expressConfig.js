const express = require("express");
const cors = require("cors");

function configureExpress(app) {
    app.use(express.json());
    app.use(cors({
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }));
}

function registerRoutes(app, upload, uploadWasmHandler, tempDir) {
    app.use('/temp', require("express").static(tempDir));
    app.post('/upload-wasm', upload.fields([
        { name: 'wasmFile', maxCount: 1 },
        { name: 'loaderFile', maxCount: 1 }
    ]), uploadWasmHandler);
}

module.exports = { configureExpress, registerRoutes };