import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Example using OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe what you see in this image in a concise way (max 50 words). Focus on the main objects, people, and activities.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 100
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content || 'Unable to analyze image';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error in analyze-frame API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze frame' },
      { status: 500 }
    );
  }
}