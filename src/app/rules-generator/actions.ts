'use server'

import { z } from 'zod'
import { generateNewRules } from '@/ai/flows/rule-generation'

const formSchema = z.object({
  playerStyles: z.string().min(10, "Please describe your player styles in a bit more detail (at least 10 characters)."),
  gameType: z.string().min(3, "Please specify the game type (at least 3 characters)."),
})

export type FormState = {
  message: string
  fields?: Record<string, string>
  issues?: string[]
  data?: {
    newRules: string
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
        playerStyles: formData.playerStyles as string,
        gameType: formData.gameType as string,
      }
    }
  }

  try {
    const result = await generateNewRules(parsed.data)
    if (!result.newRules) {
        throw new Error("AI failed to generate rules.");
    }
    return {
      message: "Successfully generated new rules!",
      data: result,
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
    return {
      message: `Failed to generate rules: ${errorMessage}`,
      fields: parsed.data
    }
  }
}
