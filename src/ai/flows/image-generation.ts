// src/ai/flows/image-generation.ts
'use server';
/**
 * @fileOverview A flow to generate images from a text prompt.
 *
 * - generateImage - A function that generates an image.
 * - ImageGenerationInput - The input type for the generateImage function.
 * - ImageGenerationOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImageGenerationInputSchema = z.object({
  prompt: z.string().describe('The text prompt for image generation.'),
});
export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;

const ImageGenerationOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type ImageGenerationOutput = z.infer<typeof ImageGenerationOutputSchema>;

export async function generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: ImageGenerationInputSchema,
    outputSchema: ImageGenerationOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: input.prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    const imageUrl = media?.url;
    if (!imageUrl) {
        throw new Error("Image generation failed to return an image.");
    }

    return { imageUrl };
  }
);
