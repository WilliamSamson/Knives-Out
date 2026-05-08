'use server';
/**
 * @fileOverview A Genkit flow to generate a unique player character for the "Knives Out" game.
 *
 * - generatePlayerCharacter - A function that handles the player character generation process.
 * - GeneratePlayerCharacterInput - The input type for the generatePlayerCharacter function.
 * - GeneratePlayerCharacterOutput - The return type for the generatePlayerCharacter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for character generation
const GeneratePlayerCharacterInputSchema = z.object({
  gameSetting: z
    .string()
    .describe(
      'A description of the game setting and core premise (e.g., "A murder mystery set among 6 close friends during a weekend getaway at a secluded mansion.")'
    ),
  existingCharacterSummaries: z
    .array(z.string())
    .optional()
    .describe(
      'Optional summaries of already generated characters, to ensure uniqueness and interconnectedness (e.g., "Name: Emily, Role: Victim, Key Relationship: Had a secret affair with someone.")'
    )
});
export type GeneratePlayerCharacterInput = z.infer<
  typeof GeneratePlayerCharacterInputSchema
>;

// Define the output schema for the generated character
const GeneratePlayerCharacterOutputSchema = z.object({
  characterName: z
    .string()
    .describe("The unique name of the generated character."),
  backstory: z
    .string()
    .describe(
      "A detailed backstory for the character, subtly hinting at potential conflicts or secrets."
    ),
  relationships: z
    .string()
    .describe(
      "Descriptions of the character's relationships with other potential characters in the game, hinting at motives or conflicts. This should be a summary of their connections within the group of friends."
    ),
  hiddenMotiveHint: z
    .string()
    .describe(
      "A subtle hint about a hidden motive or secret the character might possess, making them a potential suspect."
    )
});
export type GeneratePlayerCharacterOutput = z.infer<
  typeof GeneratePlayerCharacterOutputSchema
>;

// Exported wrapper function to call the Genkit flow
export async function generatePlayerCharacter(
  input: GeneratePlayerCharacterInput
): Promise<GeneratePlayerCharacterOutput> {
  return generatePlayerCharacterFlow(input);
}

// Define the prompt for character generation
const generateCharacterPrompt = ai.definePrompt({
  name: 'generatePlayerCharacterPrompt',
  input: { schema: GeneratePlayerCharacterInputSchema },
  output: { schema: GeneratePlayerCharacterOutputSchema },
  prompt: `You are an expert murder mystery game designer. Your task is to create a unique player character for a game called "Knives Out".
The game involves a murder among 6 close friends. Each character must have a backstory and relationships that inherently make them a potential suspect.

Game Setting: {{{gameSetting}}}

Instructions:
1.  Generate a unique character name.
2.  Craft a detailed backstory that subtly makes the character a potential suspect. It should include elements of conflict, ambition, or past grievances.
3.  Describe the character's relationships within the group of friends, highlighting any tensions, rivalries, alliances, or secret connections that could serve as motives. Make sure these relationships acknowledge the context of a group of 6 friends.
4.  Provide a subtle hint about a hidden motive or secret that the character possesses, without explicitly stating they are the killer.

{{#if existingCharacterSummaries}}
Consider the following existing characters to ensure uniqueness and interconnectedness, and to weave specific relationships if possible:
{{#each existingCharacterSummaries}}
- {{{this}}}
{{/each}}
{{/if}}

Ensure the output is formatted as a JSON object matching the output schema.
`
});

// Define the Genkit flow
const generatePlayerCharacterFlow = ai.defineFlow(
  {
    name: 'generatePlayerCharacterFlow',
    inputSchema: GeneratePlayerCharacterInputSchema,
    outputSchema: GeneratePlayerCharacterOutputSchema
  },
  async (input) => {
    const { output } = await generateCharacterPrompt(input);
    if (!output) {
      throw new Error('Failed to generate character output.');
    }
    return output;
  }
);
