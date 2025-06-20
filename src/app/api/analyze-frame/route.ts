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
    
    const prompt = `Tu función es ser los ojos de una persona ciega. Esta persona ha tomado una foto con su cámara para entender lo que hay delante suya. 
    Recuerda que la imagen que estás viendo, es el POV de la persona ciega. Es su punto de vista. La persona que tomó la foto no puede aparecer en la foto. 

ANÁLISIS DE PELIGROS: Primero evalúa si hay PELIGRO INMEDIATO que requiera alerta urgente.

SITUACIONES DE PELIGRO INMEDIATO (requieren alerta):
- Paredes o estructuras a menos de 1 metro
- Escaleras descendentes a menos de 1 metro
- Obstáculos grandes en el camino directo (postes, paredes, vehículos)
- Bordillos o desniveles peligrosos muy cerca
- Superficies resbaladizas o charcos grandes
- Vehículos en movimiento cerca
- Objetos colgantes a altura de cabeza

FORMATO DE RESPUESTA OBLIGATORIO:

Si hay PELIGRO, responde EXACTAMENTE así:
{"danger": true, "description": "Cuidado! Estás a punto de chocarte con una pared, podrías evitarla moviendote a la derecha"}

Si NO hay peligro, responde EXACTAMENTE así:
{"danger": false, "description": "Delante tuya hay una mesa y dos sillas, y una persona saludandote"}

PRIORIDADES NORMALES (sin peligro):
1. NAVEGACIÓN Y SEGURIDAD:
- Escaleras (subida/bajada), bordillos, desniveles
- Obstáculos en el suelo (cables, objetos sueltos)
- Puertas (abiertas/cerradas), pasillos libres

2. PERSONAS Y ANIMALES:
- Personas cercanas y su posición relativa
- Si ves a una persona y te parece amenazante/peligrosa, o que está haciendo algo raro, avisa al usuario
- Animales domésticos

3. OBJETOS DE USO COTIDIANO:
- Solo si están muy cerca: teléfono, llaves, utensilios

4. MOBILIARIO RELEVANTE:
- Sillas, mesas, sofás (solo si obstruyen el paso)

REGLAS IMPORTANTES:
- Máximo 20 palabras en la descripción
- NO añadas texto extra fuera del JSON
- NO expliques el análisis
- SOLO el JSON como respuesta
- Ser específico sobre distancia cuando sea relevante
- Ignorar detalles decorativos`;

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
    let responseText = response.text() || '{"danger": false, "description": "No se pudo analizar la imagen"}';
    
    // Clean the response - remove any markdown formatting or extra text
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Try to parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      
      // Validate the structure
      if (!parsedResponse.hasOwnProperty('danger') || !parsedResponse.hasOwnProperty('description')) {
        throw new Error('Invalid JSON structure');
      }
    } catch (error) {
      console.error('JSON parsing error:', error, 'Raw response:', responseText);
      
      // Fallback parsing - try to extract meaningful information
      const isDanger = responseText.toLowerCase().includes('cuidado') || 
                      responseText.toLowerCase().includes('peligro') ||
                      responseText.toLowerCase().includes('danger');
      
      let description = responseText;
      // Try to extract description from malformed JSON
      const descMatch = responseText.match(/"description":\s*"([^"]+)"/);
      if (descMatch) {
        description = descMatch[1];
      } else {
        // Clean up the text if it's not proper JSON
        description = responseText.replace(/[{}":]/g, '').replace(/danger\s*(true|false)/gi, '').trim();
        if (!description) {
          description = 'No se pudo analizar la imagen';
        }
      }
      
      parsedResponse = {
        danger: isDanger,
        description: description
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error in analyze-frame API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze frame' },
      { status: 500 }
    );
  }
}