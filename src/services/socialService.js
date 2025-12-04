import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';

export const publishPost = async (platform, account, post) => {
    console.log(`Attempting to publish to ${platform} for user ${account.username}...`);

    try {
        let result;
        switch (platform) {
            case 'twitter':
                result = await publishToTwitter(account, post);
                break;
            case 'linkedin':
                throw new Error('LinkedIn integration coming soon! Currently only Twitter is supported.');
            case 'facebook':
                throw new Error('Facebook integration coming soon! Currently only Twitter is supported.');
            case 'instagram':
                throw new Error('Instagram integration coming soon! Currently only Twitter is supported.');
            case 'tiktok':
                throw new Error('TikTok integration coming soon! Currently only Twitter is supported.');
            default:
                throw new Error(`Platform ${platform} not supported. Currently only Twitter is available.`);
        }

        console.log(`✅ Successfully published to ${platform}`);
        return {
            success: true,
            ...result,
            publishedAt: new Date()
        };

    } catch (error) {
        console.error(`❌ Failed to publish to ${platform}:`, error.message);
        // Log full error for debugging if available
        if (error.response) {
            console.error('API Error Data:', JSON.stringify(error.response.data, null, 2));
        }
        return {
            success: false,
            error: error.message
        };
    }
};

const publishToTwitter = async (account, post) => {
    try {
        // Initialize client with user's OAuth 2.0 access token
        const client = new TwitterApi(account.accessToken);
        
        // Check if token is still valid by getting user info first
        try {
            await client.v2.me();
        } catch (authError) {
            if (authError.code === 401) {
                throw new Error('Twitter access token expired. Please reconnect your account.');
            }
            throw authError;
        }

        // Upload media if present
        let mediaIds = [];
        if (post.mediaUrls && post.mediaUrls.length > 0) {
            // Note: Media upload usually requires OAuth 1.0a or specific v2 endpoints.
            // For now, we'll skip media for v2 text-only tweets.
        }

        const tweet = await client.v2.tweet(post.caption);
        return {
            postId: tweet.data.id,
            postUrl: `https://twitter.com/user/status/${tweet.data.id}`
        };
    } catch (error) {
        if (error.code === 403) {
            throw new Error('Twitter API access denied. Your app may not have write permissions or the account needs to be re-authorized.');
        }
        throw error;
    }
};

const publishToLinkedIn = async (account, post) => {
    const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
            author: `urn:li:person:${account.platformUserId}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: post.caption
                    },
                    shareMediaCategory: 'NONE' // TODO: Support IMAGE/VIDEO
                }
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${account.accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0'
            }
        }
    );

    return {
        postId: response.data.id,
        postUrl: `https://www.linkedin.com/feed/update/${response.data.id}`
    };
};

const publishToFacebook = async (account, post) => {
    // Post to Page Feed
    const response = await axios.post(
        `https://graph.facebook.com/v18.0/${account.platformUserId}/feed`,
        {
            message: post.caption,
            access_token: account.accessToken
            // link: post.mediaUrls[0]?.url // Optional link/image
        }
    );

    return {
        postId: response.data.id,
        postUrl: `https://facebook.com/${response.data.id}`
    };
};

const publishToInstagram = async (account, post) => {
    // Instagram Graph API (Content Publishing)
    // 1. Create Media Container
    const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${account.platformUserId}/media`,
        {
            image_url: post.mediaUrls[0]?.url, // IG requires an image/video
            caption: post.caption,
            access_token: account.accessToken
        }
    );

    const creationId = containerResponse.data.id;

    // 2. Publish Media
    const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${account.platformUserId}/media_publish`,
        {
            creation_id: creationId,
            access_token: account.accessToken
        }
    );

    return {
        postId: publishResponse.data.id,
        postUrl: `https://instagram.com/p/${publishResponse.data.id}` // URL might need fetching via another call
    };
};

const publishToTikTok = async (account, post) => {
    // TikTok publishing is complex (requires video upload flow).
    // For now, we'll return a placeholder or error if tried.
    throw new Error('TikTok automated publishing requires video upload flow implementation.');
};
