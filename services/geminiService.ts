
import { GoogleGenAI } from "@google/genai";

export const restoreImage = async (base64Image: string, mimeType: string): Promise<string> => {
  const apiKey = process.env.API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

  // Using gemini-2.5-flash-image for image editing/regeneration
  const prompt = `
    TASK: Exam Paper Restoration
    INPUT: A photo of a completed exam paper with handwriting, ink marks, and background noise.
    INSTRUCTIONS:
    1. Identify and REMOVE all handwritten marks, ink scribbles, and blue/red pen notations.
    2. RETAIN all original printed text, mathematical symbols, formulas, and printed lines/grids of the paper.
    3. NORMALIZE the background to be pure clean white.
    4. ENHANCE the contrast of the printed text to be sharp black (#000000).
    5. Ensure the final result looks like a clean, blank, digital-original exam paper ready for printing.
    6. Maintain high resolution and clarity of original printed fonts.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1], // Remove prefix
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No response from AI model");
    }

    // Iterate through parts to find the image
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image was returned by the model. It might have returned text instead.");
  } catch (error) {
    console.error("Gemini Restoration Error:", error);
    throw error;
  }
};
