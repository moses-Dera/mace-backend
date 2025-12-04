import mongoose from 'mongoose';

const oauthStateSchema = new mongoose.Schema({
    state: {
        type: String,
        required: true,
        unique: true
    },
    codeVerifier: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        required: true,
        enum: ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // Auto-delete after 10 minutes
    }
});

export default mongoose.model('OAuthState', oauthStateSchema);
