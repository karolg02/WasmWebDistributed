#!/usr/bin/env node

/**
 * Test script for monitoring endpoints
 * Usage: node test-monitoring.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:8080';

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        }).on('error', reject);
    });
}

async function testEndpoints() {
    console.log('🧪 Testing Monitoring Endpoints\n');
    
    const tests = [
        {
            name: 'System Stats',
            path: '/api/monitoring/stats'
        },
        {
            name: 'Active Tasks',
            path: '/api/monitoring/active'
        },
        {
            name: 'Reassignment Stats',
            path: '/api/monitoring/reassignments'
        },
        {
            name: 'User History (test@example.com)',
            path: '/api/monitoring/user/karolglanowski02@gmail.com/history'
        }
    ];

    for (const test of tests) {
        try {
            console.log(`📊 ${test.name}...`);
            const result = await makeRequest(test.path);
            
            if (result.status === 200) {
                console.log(`✅ Success (${result.status})`);
                console.log(JSON.stringify(result.data, null, 2));
            } else {
                console.log(`⚠️  Warning (${result.status})`);
                console.log(result.data);
            }
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
        console.log('');
    }

    console.log('✨ Tests completed!\n');
}

// Check if server is running
makeRequest('/api/monitoring/stats')
    .then(() => {
        console.log('✅ Server is running\n');
        return testEndpoints();
    })
    .catch(() => {
        console.log('❌ Server is not running!');
        console.log('Start the server first: npm run dev\n');
        process.exit(1);
    });
