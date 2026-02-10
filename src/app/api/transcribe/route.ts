// FRESCO Voice Transcription API
// Uses OpenAI Whisper for speech-to-text, with browser fallback

import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json();
    
    if (!audio) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    // If OpenAI API key exists, use Whisper
    if (OPENAI_API_KEY) {
      try {
        // Convert base64 to blob
        const base64Data = audio.split(',')[1];
        const binaryData = Buffer.from(base64Data, 'base64');
        
        // Create form data for Whisper API
        const formData = new FormData();
        const blob = new Blob([binaryData], { type: 'audio/webm' });
        formData.append('file', blob, 'recording.webm');
        formData.append('model', 'whisper-1');
        
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ text: data.text });
        } else {
          console.error('Whisper API error:', await response.text());
          throw new Error('Transcription failed');
        }
      } catch (error) {
        console.error('Transcription error:', error);
        // Fall through to no-API response
      }
    }

    // No API key - return instruction to use browser speech recognition
    return NextResponse.json(
      { 
        useBrowserSpeech: true,
        message: 'Using browser speech recognition'
      }, 
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
