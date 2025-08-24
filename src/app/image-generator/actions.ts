'use server'

import { z } from 'zod'
import { generateImage } from '@/ai/flows/image-generation'

const formSchema = z.object({
  prompt: z.string().min(3, "Please enter a more descriptive prompt (at least 3 characters)."),
})

export type FormState = {
  message: string
  fields?: Record<string, string>
  issues?: string[]
  data?: {
    imageUrl: string
  }
}

export async function onGenerate(prevState: FormState, data: FormData): Promise<FormState> {
  const formData = Object.fromEntries(data)
  const parsed = formSchema.safeParse(formData)

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message)
    return {
      message: 'Invalid form data. Please check the errors and try again.',
      issues,
      fields: {
        prompt: formData.prompt as string,
      }
    }
  }

  try {
    const result = await generateImage(parsed.data)
    if (!result.imageUrl) {
        throw new Error("AI failed to generate an image.");
    }
    return {
      message: "Successfully generated image!",
      data: result,
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return {
      message: `Failed to generate image: ${errorMessage}`,
      fields: parsed.data
    }
  }
}
