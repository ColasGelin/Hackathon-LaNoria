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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Convert base64 image to the format Gemini expects
    const imageData = image.split(',')[1]; // Remove data:image/jpeg;base64, prefix
    
    const prompt = `Tu función es ser los ojos de una persona ciega. Esta persona ha tomado una foto con su cámara para entender lo que hay delante suya. 

PRIORIDADES DE DETECCIÓN (detecta solo lo MÁS IMPORTANTE):

1. NAVEGACIÓN Y SEGURIDAD (MÁXIMA PRIORIDAD):
- Escaleras (subida/bajada), bordillos, desniveles
- Obstáculos en el suelo (cables, objetos sueltos, charcos)
- Puertas (abiertas/cerradas), pasillos libres
- Superficies resbaladizas o peligrosas

2. PERSONAS Y ANIMALES:
- Personas cercanas y su posición relativa
- Animales domésticos

3. OBJETOS DE USO COTIDIANO:
- Solo si están muy cerca: teléfono, llaves, utensilios de cocina

4. MOBILIARIO RELEVANTE:
- Sillas, mesas, sofás (solo si obstruyen el paso)

INSTRUCCIONES:
- Empezar con "Delante tuya..." 
- Priorizar elementos de seguridad y navegación
- Ignorar detalles decorativos, cielo, paredes vacías
- Máximo 25 palabras
- Ser específico sobre distancia y posición cuando sea relevante para la seguridad

Describe SOLO lo esencial para la navegación y seguridad de esta persona ciega:`;

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
    const description = response.text() || 'No se pudo analizar la imagen';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error in analyze-frame API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze frame' },
      { status: 500 }
    );
  }
}