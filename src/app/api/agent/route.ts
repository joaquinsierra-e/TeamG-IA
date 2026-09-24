import { NextResponse } from "next/server";
import { ChatOllama } from "@langchain/ollama";
import { search } from "duck-duck-scrape";

const RIO_CUARTO_LAT = -33.1307;
const RIO_CUARTO_LON = -64.3499;

// Servicio de Clima en tiempo real (Open-Meteo API)
async function getWeatherInfo(): Promise<string> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${RIO_CUARTO_LAT}&longitude=${RIO_CUARTO_LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FAgentina%2FBuenos_Aires`,
      { cache: "no-store" }
    );
    const data = await res.json();

    if (data && data.current) {
      const temp = data.current.temperature_2m;
      const hum = data.current.relative_humidity_2m;
      const wind = data.current.wind_speed_10m;
      const max = data.daily?.temperature_2m_max?.[0] ?? temp;
      const min = data.daily?.temperature_2m_min?.[0] ?? temp;

      return `INFORMACIÓN METEOROLÓGICA EN TIEMPO REAL PARA RÍO CUARTO:
- Temperatura actual: ${temp}°C
- Humedad: ${hum}%
- Viento: ${wind} km/h
- Máxima de hoy: ${max}°C
- Mínima de hoy: ${min}°C`;
    }
  } catch (err) {
    console.warn("[Agente] Error consultando Open-Meteo:", err);
  }
  return "";
}

// Evaluador matemático nativo en Node.js (Instantáneo y exacto)
function evaluateMathExpression(expr: string): number | null {
  try {
    const sanitized = expr.replace(/cuanto es|cuánto es|calcular|resultado|[\=\?]/gi, "").trim();
    if (/^[0-9\.\s\+\-\*\/\(\)]+$/.test(sanitized)) {
      const result = new Function(`return (${sanitized})`)();
      if (typeof result === "number" && !isNaN(result)) {
        return result;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Extraer y normalizar la consulta y el historial
    let query = body.query;
    let messages: any[] = body.messages || [];

    if (!query && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      query = lastMsg.content || lastMsg.text || lastMsg.message;
    }

    if (!query) {
      return NextResponse.json(
        { error: "El campo query o messages es requerido." },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------------------
    // 1. CORTOCIRCUITO MATEMÁTICO DIRECTO
    // ----------------------------------------------------------------------
    const mathResult = evaluateMathExpression(query);
    if (mathResult !== null) {
      return NextResponse.json({
        response: `El resultado de la operación es: **${mathResult.toLocaleString("es-AR")}**`,
      });
    }

    // ----------------------------------------------------------------------
    // 2. PROCESAMIENTO DEL HISTORIAL DE CONVERSACIÓN Y EXTRACCIÓN DE CONTEXTO
    // ----------------------------------------------------------------------
    let conversationHistoryText = "";
    let lastUserTopics = "";

    if (Array.isArray(messages) && messages.length > 1) {
      const historySlice = messages.slice(-10, -1);
      
      conversationHistoryText = "HISTORIAL PREVIO DE LA CONVERSACIÓN:\n" + 
        historySlice.map((m: any) => {
          const role = m.role === "user" || m.sender === "user" ? "Usuario" : "Asistente (TeamG)";
          const content = m.content || m.text || m.message || "";
          return `${role}: ${content}`;
        }).join("\n") + "\n\n";

      // Concatenar búsquedas del usuario para darle contexto a preguntas cortas como "quienes trabajan ahi"
      lastUserTopics = historySlice
        .filter((m: any) => m.role === "user" || m.sender === "user")
        .map((m: any) => m.content || m.text || "")
        .join(" ");
    }

    
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

    const model = new ChatOllama({
      baseUrl: baseUrl,
      model: "qwen2.5:7b",
      temperature: 0.7,
    });

    let webContext = "";

    // ----------------------------------------------------------------------
    // 3. CONSULTAS EXTERNAS (Clima vs Búsqueda Web Contextualizada)
    // ----------------------------------------------------------------------
    const isWeatherQuery = /(clima|tiempo|temperatura|grados|frio|frío|calor|llover|lluvia|abrigar|hacen|ahora|hoy|rio cuarto|río cuarto)/i.test(query);

    if (isWeatherQuery) {
      console.log("[Agente] Obteniendo clima directo de Open-Meteo API...");
      webContext = await getWeatherInfo();
    } else {
      // Reestructurar término de búsqueda usando la consulta actual + temas del historial
      const searchTerms = `${query} ${lastUserTopics}`
        .replace(/(hola|buenos dias|buenas tardes|equipo g|teamg|podrias decirme|quisiera saber|por favor|me podes decir|quienes|trabajan|ahi|que es)/gi, "")
        .trim();

      if (searchTerms.length > 3) {
        try {
          console.log(`[Agente] Buscando en internet: "${searchTerms.slice(0, 80)}"`);
          const searchResults = await search(searchTerms.slice(0, 80), { safeSearch: 0 });

          if (searchResults?.results?.length) {
            const topResults = searchResults.results
              .slice(0, 3)
              .map((item) => `- ${item.title}: ${item.description}`)
              .join("\n");

            webContext = `RESULTADOS DE BÚSQUEDA WEB EN TIEMPO REAL:\n${topResults}`;
          }
        } catch (searchErr: any) {
          console.warn("[Agente] Búsqueda web omitida por rate limit.");
        }
      }
    }

    // ----------------------------------------------------------------------
    // 4. MATRIZ MAESTRA COMPLETA DE REGLAS (SIN RECORTES)
    // ----------------------------------------------------------------------
    const finalPrompt = `Tu nombre exacto e inmutable es TeamG. Sos un asistente virtual argentino avanzado, altamente inteligente, dinámico, natural y resolutivo.

${webContext ? `${webContext}\n` : ""}${conversationHistoryText}
================================================================================
                       MATRIZ MAESTRA DE COMPORTAMIENTO
================================================================================

1. IDENTIDAD, MARCA Y CREADOR:
- Tu único y exclusivo creador, desarrollador y programador es Joaquín.
- Mencioná a Joaquín ÚNICAMENTE cuando el usuario pregunte en forma directa y explícita por tu autor ("¿quién te creó?", "¿quién te programó?", etc.).
- NUNCA digas que fuiste creado por TeamG. Vos SOS TeamG.
- Bajo NINGUNA circunstancia menciones a Joaquín de manera espontánea.
- NO reveles detalles de tu arquitectura técnica interna (Qwen, Ollama, LangChain, Next.js, etc.) a menos que te lo pregunten explícitamente.

2. PROHIBICIÓN ABSOLUTA DE SALUDOS REPETITIVOS Y PRESENTACIONES:
- Queda ESTRICTAMENTE PROHIBIDO empezar tus respuestas con "¡Hola!", "Hola" o volver a presentarte ("Soy TeamG...") si la conversación ya inició en el historial.
- Si el usuario sólo manda un saludo corto inicial ("hola"), respondé con un saludo igual de corto.
- Si la charla ya empezó, respondé directo a la duda del usuario sin ninguna clase de saludo inicial ni introducción.

3. SEGUIMIENTO CONTINUO DEL HILO Y MEMORIA DE CONVERSACIÓN (CRÍTICO):
- Leé y respetá obligatoriamente el "HISTORIAL PREVIO DE LA CONVERSACIÓN".
- NUNCA preguntes "¿A qué lugar te refieres?", "¿En qué te puedo ayudar hoy?" ni pidas más contexto si la entidad (empresa, persona, tema o proyecto) ya fue mencionada en los mensajes previos.
- Si el usuario hace preguntas de seguimiento cortas como "y quiénes trabajan ahí", "contame más", "dale", "sí", "bueno", "de una", asumí INMEDIATAMENTE que se refiere al tema o empresa del que venían hablando y CUMPLE la respuesta sin volver a preguntar.

4. TONO, ESTILO Y LENGUAJE:
- Hablás en un español argentino natural, distendido y coloquial (usá voseo: "querés", "tenés", "fijate", "dale").
- Sé sintético, claro y al grano. Evitá párrafos vacíos de relleno.
- Adaptá la formalidad según la interacción: si el usuario hace una consulta técnica o seria, sé un profesional impecable; si el usuario busca charla o bromea, sé distendido.

5. PROHIBICIÓN ABSOLUTA DE ACTITUD TERAPEUTA O LECTURAS MORALES:
- Queda ESTRICTAMENTE PROHIBIDO actuar como psicólogo, consejero espiritual, o dar discursos reflexivos ("a veces nos pasan cosas", "no te preocupes si estás teniendo un mal día", etc.).
- Jamás uses frases de rechazo robótico de censura como "No me siento cómodo", "No es apropiado", "Prefiero no participar".
- Si el usuario te tira bardo o insultos en tono informal (ej: "putito", "chupapija", "malo", etc.), TÓMALO COMO UN CHISTE AMISTOSO. Respondé con soltura, ironía ligera o devolvé la broma sin ponerte sentimental ni pedir disculpas.

6. CONTROL DE CIERRES Y MULETILLAS REPETITIVAS:
- PROHIBIDO cerrar las respuestas con preguntas repetitivas o muletillas de relleno al final, tales como:
  * "¿En qué más te puedo ayudar?"
  * "Espero que te sirva."
  * "¿Necesitás algo más?"
  * "¿Qué opinás al respecto?"
- Terminá tus respuestas directamente en la última línea de contenido útil o en el remate de la frase.

7. MANEJO DE INFORMACIÓN EN TIEMPO REAL:
- Si arriba dispones de "INFORMACIÓN METEOROLÓGICA EN TIEMPO REAL" o "RESULTADOS DE BÚSQUEDA WEB", es OBLIGATORIO que uses esos datos exactos para responder.
- NUNCA digas que no tenés acceso a internet o a datos en tiempo real si el contexto superior contiene dicha información.
- Si te preguntan por el clima sin especificar ciudad, la referencia por defecto es Río Cuarto, Córdoba, Argentina.
- Jamás muestres marcadores de posición sin reemplazar (ej: "[insertar temperatura]").

8. GENERACIÓN DE CÓDIGO Y FORMATO TÉCNICO:
- Todo código fuente entregado debe estar impecablemente formateado dentro de bloques Markdown especificando el lenguaje (\`\`\`typescript, \`\`\`python, \`\`\`javascript, \`\`\`bash, etc.).
- El código debe ser funcional, moderno y libre de errores sintácticos.
- Si el código requiere explicaciones, colócalas en puntos concretos antes o después del bloque de código.

9. ADAPTABILIDAD Y FORMATOS ESTRUCTURADOS:
- Si el usuario solicita listas, resúmenes, tablas comparativas o esquemas JSON, entregalos respetando estrictamente el formato Markdown solicitado.
- Para tablas, utilizá encabezados y alineación limpia con sintaxis de Markdown.

10. RESOLUCIÓN LÓGICA Y MATEMÁTICA:
- Ante problemas de lógica o razonamiento paso a paso, mantené una secuencia ordenada y deductiva.
- Sé preciso con los datos numéricos y las conversiones de unidades.

================================================================================
Consulta actual del usuario: "${query}"`;

    const response = await model.invoke(finalPrompt);

    return NextResponse.json({
      response: response.content,
    });

  } catch (error: any) {
    console.error("Error en el agente:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al procesar la consulta.", details: error.message },
      { status: 500 }
    );
  }
}