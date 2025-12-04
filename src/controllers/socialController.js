import crypto from 'crypto';
import { TwitterApi } from 'twitter-api-v2';
import User from '../models/User.js';
import Log from '../models/Log.js';
import ConnectedAccount from '../models/ConnectedAccount.js';
import OAuthState from '../models/OAuthState.js';

// Helper to decode Facebook signed request
const parseSignedRequest = (signedRequest, appSecret) => {
    try {
        const [encodedSig, payload] = signedRequest.split('.');

        // Decode the data
        const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
        const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

        // Confirm the signature
        const expectedSig = crypto
            .createHmac('sha256', appSecret)
            .update(payload)
            .digest('hex');

        if (sig !== expectedSig) {
            console.error('Bad Signed JSON signature!');
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error parsing signed request:', error);
        return null;
    }
};

// Twitter OAuth Flow (OAuth 2.0)
export const initiateTwitterAuth = async (req, res, next) => {
    try {
        console.log('🐦 Initiating Twitter OAuth...');
        console.log('Client ID:', process.env.TWITTER_CLIENT_ID ? 'Present' : 'Missing');
        console.log('Client Secret:', process.env.TWITTER_CLIENT_SECRET ? 'Present' : 'Missing');
        
        if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
            return res.status(400).json({ 
                error: 'Twitter OAuth credentials not configured',
                details: 'Missing TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET'
            });
        }

        // Determine frontend URL based on request origin or environment
        const origin = req.get('origin') || req.get('referer');
        let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        if (origin) {
            if (origin.includes('socialai-beta.vercel.app')) {
                frontendUrl = 'https://socialai-beta.vercel.app';
            } else if (origin.includes('localhost')) {
                frontendUrl = 'http://localhost:5173';
            }
        }
        
        console.log('Request origin:', origin);
        console.log('Using frontend URL:', frontendUrl);

        const client = new TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
        });

        const callbackUrl = frontendUrl + '/social/callback/twitter';
        console.log('Callback URL:', callbackUrl);

        // Generate auth link with write permissions
        const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
            callbackUrl,
            { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
        );

        console.log('Generated auth URL:', url);
        console.log('State:', state);

        // Store state and verifier
        await OAuthState.create({
            state,
            codeVerifier,
            platform: 'twitter',
            userId: req.user._id
        });

        res.json({ url });
    } catch (error) {
        console.error('❌ Twitter OAuth Error:', error);
        res.status(400).json({ 
            error: 'Failed to initiate Twitter OAuth',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const handleTwitterCallback = async (req, res, next) => {
    try {
        console.log('🐦 Handling Twitter callback...');
        const { state, code } = req.body;
        console.log('Received state:', state);
        console.log('Received code:', code ? 'Present' : 'Missing');

        if (!state || !code) {
            return res.status(400).json({ error: 'Missing state or code' });
        }

        // Verify state
        const savedState = await OAuthState.findOne({ state, platform: 'twitter' });
        if (!savedState) {
            console.error('❌ Invalid or expired state');
            return res.status(400).json({ error: 'Invalid or expired state' });
        }

        // Exchange code for tokens
        const client = new TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID,
            clientSecret: process.env.TWITTER_CLIENT_SECRET,
        });

        // Use the same frontend URL detection logic
        const origin = req.get('origin') || req.get('referer');
        let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        if (origin) {
            if (origin.includes('socialai-beta.vercel.app')) {
                frontendUrl = 'https://socialai-beta.vercel.app';
            } else if (origin.includes('localhost')) {
                frontendUrl = 'http://localhost:5173';
            }
        }

        const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
            code,
            codeVerifier: savedState.codeVerifier,
            redirectUri: frontendUrl + '/social/callback/twitter',
        });

        // Get user info
        const { data: userObject } = await loggedClient.v2.me();
        console.log('✅ Twitter user authenticated:', userObject.username);

        // Save/Update ConnectedAccount
        await ConnectedAccount.findOneAndUpdate(
            { userId: savedState.userId, platform: 'twitter' },
            {
                platformUserId: userObject.id,
                username: userObject.username,
                displayName: userObject.name,
                profilePicture: userObject.profile_image_url,
                accessToken,
                refreshToken,
                tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
                isActive: true
            },
            { upsert: true, new: true }
        );

        // Cleanup state
        await OAuthState.deleteOne({ _id: savedState._id });

        res.json({ success: true });
    } catch (error) {
        console.error('❌ Twitter callback error:', error);
        res.status(400).json({ 
            error: 'Twitter callback failed',
            details: error.message
        });
    }
};

export const handleFacebookDeletion = async (req, res) => {
    try {
        const signedRequest = req.body.signed_request;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (!signedRequest || !appSecret) {
            return res.status(400).json({ error: 'Invalid request or missing config' });
        }

        const data = parseSignedRequest(signedRequest, appSecret);

        if (!data) {
            return res.status(400).json({ error: 'Invalid signed request' });
        }

        const userId = data.user_id;

        console.log(`Received deletion request for Facebook User ID: ${userId}`);

        // We'll soft-delete by marking the account as inactive and clearing tokens
        await ConnectedAccount.updateMany(
            { platformUserId: userId, platform: 'facebook' },
            {
                $set: {
                    isActive: false,
                    accessToken: null,
                    refreshToken: null,
                    deletedAt: new Date()
                }
            }
        );

        const confirmationCode = crypto.randomBytes(16).toString('hex');
        const statusUrl = `${process.env.FRONTEND_URL}/data-deletion/status/${confirmationCode}`;

        await Log.create({
            type: 'system',
            action: 'facebook_data_deletion_request',
            status: 'success',
            details: { facebookUserId: userId, confirmationCode }
        });

        return res.json({
            url: statusUrl,
            confirmation_code: confirmationCode,
        });

    } catch (error) {
        console.error('Facebook deletion callback error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
