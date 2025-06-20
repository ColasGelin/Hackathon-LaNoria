import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Convert base64 image to the format Gemini expects
    const imageData = image.split(',')[1]; // Remove data:image/jpeg;base64, prefix
    
    const prompt = `Eres un sistema de emergencias para una persona ciega. Esta persona ha activado una llamada de emergencia y ha tomado una foto de su situación actual para proporcionar contexto a los servicios de emergencia.
Tu objetivo es generar un mensaje para enviarselo a los servicios de emergencia, basado en el análisis de la imagen proporcionada.
ANÁLISIS LA IMAGEN tomada por una persona ciega que está pidiendo ayuda de emergencia.

Tu tarea es crear un mensaje de emergencia profesional que incluya:

1. UBICACIÓN Y CONTEXTO VISUAL:
   - Describe el entorno donde se encuentra la persona
   - Identifica si está en interior/exterior, tipo de lugar
   - Menciona elementos distintivos que ayuden a localizar

2. SITUACIÓN DE EMERGENCIA: ESTO ES LO MAS IMPORTANTE DEL MENSAJE
   - Evalúa signos de peligro o emergencia visible
   - Describe la condición del entorno
   - Identifica posibles riesgos o amenazas

3. INFORMACIÓN PARA RESCATE:
   - Elementos que faciliten el acceso de servicios de emergencia
   - Obstáculos potenciales para el rescate
   - Referencias visuales para localización

FORMATO DE RESPUESTA:
Responde SOLO con un mensaje de emergencia claro y conciso para servicios de emergencia, máximo 150 palabras, en español.

Ejemplo de formato:
"Emergencia: Persona ciega solicita asistencia. Se encuentra en [descripción del lugar]. Situación observada: [descripción de la emergencia]. Acceso: [información para servicios de emergencia]. Elementos distintivos: [referencias visuales]."

NO incluyas JSON, solo el mensaje de emergencia directo.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    let emergencyMessage = response.text() || 'Emergencia: Persona ciega solicita asistencia inmediata. No se pudo analizar la situación visual.';
    
    // Clean the response - remove any markdown formatting
    emergencyMessage = emergencyMessage.replace(/```.*\n/g, '').replace(/```/g, '').trim();
    
    // Ensure it starts with "Emergencia:" if it doesn't already
    if (!emergencyMessage.toLowerCase().includes('emergencia')) {
      emergencyMessage = `Emergencia: Persona ciega solicita asistencia. ${emergencyMessage}`;
    }

    return NextResponse.json({ 
      message: emergencyMessage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in emergency API:', error);
    return NextResponse.json(
      { 
        message: 'Emergencia: Persona ciega solicita asistencia inmediata. Error al analizar la situación visual.',
        timestamp: new Date().toISOString(),
        error: 'Failed to analyze emergency situation' 
      },
      { status: 500 }
    );
  }
}
