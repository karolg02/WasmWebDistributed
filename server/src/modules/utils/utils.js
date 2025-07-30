function sanitizeJsIdentifier(id) {
    if (!id || typeof id !== 'string') {
        return 'unknown_client';
    }
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

module.exports = { sanitizeJsIdentifier };