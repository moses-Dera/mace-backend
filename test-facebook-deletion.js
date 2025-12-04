import crypto from 'crypto';
import axios from 'axios';

// Configuration
const PORT = 5000; // Your backend port
const API_URL = `http://localhost:${PORT}/api/social/callback/facebook/deletion`;
const APP_SECRET = 'test_secret'; // Must match FACEBOOK_APP_SECRET in your .env
const USER_ID = '1234567890'; // Dummy Facebook User ID

// Helper to generate signed_request
const generateSignedRequest = (payload, secret) => {
    const payloadJson = JSON.stringify(payload);
    const encodedPayload = Buffer.from(payloadJson).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const signature = crypto
        .createHmac('sha256', secret)
        .update(encodedPayload)
        .digest('hex'); // Facebook uses hex for the signature part in some docs, but often it's raw. 
    // However, the controller expects: sig + '.' + payload
    // And the controller decodes sig as: Buffer.from(encodedSig..., 'base64').toString('hex')
    // Wait, looking at the controller:
    // const sig = Buffer.from(encodedSig..., 'base64').toString('hex');
    // const expectedSig = crypto...digest('hex');
    // So the controller expects the signature in the URL to be base64 encoded version of the hex digest?
    // Let's re-read the controller code carefully.

    // Controller logic:
    // const [encodedSig, payload] = signedRequest.split('.');
    // const sig = Buffer.from(encodedSig..., 'base64').toString('hex');
    // const expectedSig = crypto...digest('hex');

    // So 'sig' (decoded from base64) must equal 'expectedSig' (hex string).
    // This means 'encodedSig' must be the base64 encoding of the HEX STRING of the HMAC.
    // This is a bit unusual (usually it's base64 of the raw binary HMAC), but let's follow the controller's logic.

    // Controller expects the signature to be the base64 encoding of the RAW HMAC bytes.
    // The controller decodes it: Buffer.from(..., 'base64').toString('hex') -> compares with digest('hex')

    const hmac = crypto.createHmac('sha256', secret).update(encodedPayload).digest(); // Raw buffer
    const encodedSig = hmac.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return `${encodedSig}.${encodedPayload}`;
};

const run = async () => {
    try {
        console.log('--- STARTING TEST ---');
        console.log('Generating signed request...');
        const payload = {
            user_id: USER_ID,
            algorithm: 'HMAC-SHA256',
            issued_at: Math.floor(Date.now() / 1000)
        };

        const signedRequest = generateSignedRequest(payload, APP_SECRET);
        console.log('Signed Request:', signedRequest);

        console.log(`Sending POST request to ${API_URL}...`);
        const response = await axios.post(API_URL, {
            signed_request: signedRequest
        });

        console.log('Response:', response.data);
        console.log('✅ Test Passed! Check your backend logs for the deletion message.');
        console.log('Check the status URL returned in the response to verify it works.');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        if (error.code === 'ECONNREFUSED') {
            console.log('Is your backend server running?');
        }
    }
};

run();
