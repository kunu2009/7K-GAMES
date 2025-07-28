// src/ai/flows/rule-generation.ts
'use server';
/**
 * @fileOverview A flow to generate new game rules based on player styles and strategies.
 *
 * - generateNewRules - A function that generates new game rules.
 * - RuleGenerationInput - The input type for the generateNewRules function.
 * - RuleGenerationOutput - The return type for the generateNewRules function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RuleGenerationInputSchema = z.object({
  playerStyles: z
    .string()
    .describe('Description of the players past styles and strategies.'),
  gameType: z.string().describe('The type of game for which rules should be generated.'),
});
export type RuleGenerationInput = z.infer<typeof RuleGenerationInputSchema>;

const RuleGenerationOutputSchema = z.object({
  newRules: z.string().describe('New rules for the game based on player styles.'),
});
export type RuleGenerationOutput = z.infer<typeof RuleGenerationOutputSchema>;

export async function generateNewRules(input: RuleGenerationInput): Promise<RuleGenerationOutput> {
  return generateNewRulesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'ruleGenerationPrompt',
  input: {schema: RuleGenerationInputSchema},
  output: {schema: RuleGenerationOutputSchema},
  prompt: `You are a game designer who specializes in creating adaptive game rules.

  Based on the player styles and the game type, generate new rules that will make the game more challenging and fun.

  Player Styles: {{{playerStyles}}}
  Game Type: {{{gameType}}}

  New Rules:`,
});

const generateNewRulesFlow = ai.defineFlow(
  {
    name: 'generateNewRulesFlow',
    inputSchema: RuleGenerationInputSchema,
    outputSchema: RuleGenerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
