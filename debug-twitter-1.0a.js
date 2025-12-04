import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';

dotenv.config();

const debugTwitter = async () => {
    console.log('--- DEBUGGING TWITTER OAUTH 1.0a ---');
    console.log('API Key:', process.env.TWITTER_API_KEY ? 'Set' : 'Missing');
    console.log('API Secret:', process.env.TWITTER_API_SECRET ? 'Set' : 'Missing');
    console.log('Frontend URL:', process.env.FRONTEND_URL);

    const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
    });

    try {
        const callbackUrl = process.env.FRONTEND_URL + '/social/callback/twitter';
        console.log('Attempting to generate auth link with callback:', callbackUrl);

        const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(
            callbackUrl
        );

        console.log('✅ Success!');
        console.log('Auth URL:', url);
        console.log('OAuth Token:', oauth_token);
    } catch (error) {
        console.error('❌ Error generating auth link:');
        console.error('Message:', error.message);
        if (error.data) {
            console.error('API Error Data:', JSON.stringify(error.data, null, 2));
        }
    }
};

debugTwitter();
