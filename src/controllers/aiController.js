import axios from 'axios';
import User from '../models/User.js';
import Log from '../models/Log.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const generateCaption = async (req, res, next) => {
  try {
    const { prompt, tone = 'professional', platform = 'instagram' } = req.body;

    // Check user's AI usage limits
    const user = await User.findById(req.user._id);
    const limit = getAILimit(user.plan);
    const currentUsage = user.apiUsage.aiRequestsThisMonth || 0;

    if (currentUsage >= limit) {
      return res.status(429).json({
        success: false,
        message: `AI usage limit reached for this month (${currentUsage}/${limit}). Upgrade your plan for more requests.`
      });
    }

    const systemPrompt = `You are a social media expert. Generate an engaging ${tone} caption for ${platform}. Keep it concise and include relevant emojis.`;

    // Use Gemini API if key is available, otherwise use mock
    let caption;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
      try {
        console.log('🤖 Attempting Gemini API call...');
        const enhancedPrompt = buildDynamicPrompt(prompt, tone, platform);

        const response = await axios.post(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
          contents: [{
            parts: [{
              text: enhancedPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          caption = response.data.candidates[0].content.parts[0].text.trim();
          console.log('✅ Gemini API success');
        } else {
          console.log('❌ Gemini API returned invalid response structure');
          caption = getMockCaption(prompt);
        }
      } catch (geminiError) {
        console.error('❌ Gemini API Error:', {
          status: geminiError.response?.status,
          statusText: geminiError.response?.statusText,
          data: geminiError.response?.data,
          message: geminiError.message
        });
        console.log('🔄 Falling back to mock response');
        caption = getMockCaption(prompt);
      }
    } else {
      console.log('⚠️ No Gemini API key found, using mock response');
      caption = getMockCaption(prompt);
    }

    // Update user's AI usage
    user.apiUsage.aiRequestsThisMonth += 1;
    await user.save();

    await Log.create({
      userId: req.user._id,
      type: 'ai',
      action: 'caption_generated',
      status: 'success',
      details: { platform, tone }
    });

    res.json({
      success: true,
      caption
    });
  } catch (error) {
    let errorMessage = 'AI service temporarily unavailable';

    if (error.response?.status === 429) {
      errorMessage = 'OpenAI rate limit exceeded. Please try again in a few minutes.';
    } else if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    await Log.create({
      userId: req.user._id,
      type: 'ai',
      action: 'caption_generation_failed',
      status: 'failure',
      errorMessage
    });

    res.status(429).json({
      success: false,
      message: errorMessage
    });
  }
};

export const testGeminiAPI = async (req, res) => {
  try {
    console.log('🗺️ Testing Gemini API connection...');
    console.log('API Key present:', !!process.env.GEMINI_API_KEY);
    console.log('API Key length:', process.env.GEMINI_API_KEY?.length);

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ success: false, error: 'No API key found' });
    }

    const response = await axios.post(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: 'Say hello in a friendly way'
        }]
      }]
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    res.json({
      success: true,
      message: 'Gemini API is working!',
      response: response.data.candidates?.[0]?.content?.parts?.[0]?.text
    });
  } catch (error) {
    console.error('Gemini test failed:', error.response?.data || error.message);
    res.json({
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    });
  }
};

export const generateHashtags = async (req, res, next) => {
  try {
    const { content, platform = 'instagram', count = 10 } = req.body;

    const user = await User.findById(req.user._id);
    if (user.apiUsage.aiRequestsThisMonth >= getAILimit(user.plan)) {
      return res.status(429).json({
        success: false,
        message: 'AI usage limit reached for this month'
      });
    }

    const prompt = `Generate ${count} relevant, high-performing hashtags for this ${platform} post: "${content}". Return ONLY the hashtags separated by spaces. Do not include numbering or explanations.`;

    let hashtags;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
      try {
        console.log('🤖 Attempting Gemini API for hashtags...');
        const response = await axios.post(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          }
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const text = response.data.candidates[0].content.parts[0].text.trim();
          // Extract hashtags using regex to ensure clean output
          const extracted = text.match(/#[a-zA-Z0-9_]+/g);
          if (extracted && extracted.length > 0) {
            hashtags = extracted.slice(0, count);
            console.log('✅ Gemini API hashtags success');
          } else {
            throw new Error('No hashtags found in response');
          }
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (error) {
        console.error('❌ Gemini API Hashtag Error:', error.message);
        console.log('🔄 Falling back to mock hashtags');
        hashtags = getMockHashtags(content, count);
      }
    } else {
      console.log('⚠️ No Gemini API key, using mock hashtags');
      hashtags = getMockHashtags(content, count);
    }

    user.apiUsage.aiRequestsThisMonth += 1;
    await user.save();

    res.json({
      success: true,
      hashtags
    });
  } catch (error) {
    next(error);
  }
};

const buildDynamicPrompt = (prompt, tone, platform) => {
  const platformSpecs = {
    instagram: { maxLength: 2200, style: 'visual storytelling with emojis', audience: 'lifestyle-focused' },
    twitter: { maxLength: 280, style: 'concise and punchy', audience: 'news and conversation-driven' },
    linkedin: { maxLength: 3000, style: 'professional insights', audience: 'business professionals' },
    facebook: { maxLength: 500, style: 'community engagement', audience: 'diverse demographics' },
    tiktok: { maxLength: 150, style: 'trendy and energetic', audience: 'Gen Z and millennials' }
  };

  const toneGuides = {
    professional: 'authoritative yet approachable, industry expertise',
    casual: 'friendly conversational, relatable and authentic',
    funny: 'witty humor, clever wordplay, entertaining',
    inspiring: 'motivational, uplifting, empowering',
    educational: 'informative, teaching-focused, valuable insights'
  };

  const spec = platformSpecs[platform] || platformSpecs.instagram;
  const toneGuide = toneGuides[tone] || toneGuides.professional;

  return `You are an expert social media content creator with deep understanding of human psychology and engagement patterns.

Context:
- Platform: ${platform} (${spec.style}, ${spec.audience})
- Tone: ${tone} (${toneGuide})
- Topic: ${prompt}
- Character limit: ${spec.maxLength}

Create a compelling caption that:
1. Hooks attention in the first 5 words
2. Tells a micro-story or shares valuable insight
3. Uses natural, conversational language
4. Includes strategic emojis (not overwhelming)
5. Ends with engaging question or call-to-action
6. Feels authentically human, not AI-generated

Avoid:
- Generic motivational quotes
- Overused phrases like "game-changer" or "unlock"
- Excessive hashtags in the caption
- Robotic or salesy language

Generate ONE caption only:`;
};

const getMockCaption = (prompt) => {
  const dynamicCaptions = [
    `Just discovered something fascinating about ${prompt}... and honestly, it's changed my entire perspective. Sometimes the best insights come from the most unexpected places. What's the last thing that completely shifted your thinking? 🤔`,

    `Real talk: ${prompt} isn't what I thought it would be. Three months ago, I had completely different expectations. Here's what actually happened... (and why I'm grateful for being wrong) ✨`,

    `That moment when ${prompt} finally clicks... 💡 You know that feeling when everything suddenly makes sense? Just had one of those breakthrough moments and had to share. Anyone else experience this recently?`,

    `Plot twist: ${prompt} taught me more about myself than I expected. Funny how life works like that, right? Sometimes we think we're learning one thing, but we're actually discovering something completely different about who we are.`,

    `Can we talk about ${prompt} for a second? Because what I'm seeing lately is absolutely mind-blowing. Not in a hypey way, but in a 'this is genuinely changing how people think' way. Thoughts? 🧠`
  ];

  return dynamicCaptions[Math.floor(Math.random() * dynamicCaptions.length)];
};

const getMockHashtags = (content, count) => {
  const mockHashtags = {
    cooking: ['#Cooking', '#Foodie', '#HomeMade', '#Recipe', '#Delicious', '#Chef', '#Kitchen', '#Food', '#Yummy', '#Tasty'],
    business: ['#Business', '#Success', '#Entrepreneur', '#Leadership', '#Growth', '#Innovation', '#Strategy', '#Professional', '#Career', '#Motivation'],
    travel: ['#Travel', '#Adventure', '#Wanderlust', '#Explore', '#Journey', '#Vacation', '#Tourism', '#Discover', '#Nature', '#Photography'],
    fitness: ['#Fitness', '#Workout', '#Health', '#Gym', '#Strong', '#Motivation', '#Exercise', '#Wellness', '#Strength', '#Healthy']
  };

  const key = content.toLowerCase().split(' ')[0];
  const baseHashtags = mockHashtags[key] || ['#Content', '#Social', '#Media', '#Post', '#Share', '#Engage', '#Community', '#Digital', '#Online', '#Creative'];
  return baseHashtags.slice(0, count);
};

const getAILimit = (plan) => {
  const limits = {
    free: 100,
    basic: 500,
    pro: 2000,
    enterprise: 10000
  };
  return limits[plan] || limits.free;
};