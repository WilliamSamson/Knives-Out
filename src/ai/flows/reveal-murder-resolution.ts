'use server';
/**
 * @fileOverview A Genkit flow to reveal the true killer and provide a narrative recap of the murder.
 *
 * - revealMurderResolution - A function that orchestrates the murder revelation and recap generation.
 * - RevealMurderResolutionInput - The input type for the revealMurderResolution function.
 * - RevealMurderResolutionOutput - The return type for the revealMurderResolution function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GameScenarioSchema = z.object({
  victim: z.object({
    name: z.string().describe("The victim's name."),
    description: z.string().describe("A brief description of the victim."),
  }),
  trueKiller: z.object({
    name: z.string().describe("The true killer's name."),
    motive: z.string().describe("The true killer's motive for the murder."),
    method: z.string().describe("The method used to commit the murder."),
  }),
  allCharacterAlibis: z
    .array(
      z.object({
        characterName: z.string().describe("The character's name."),
        alibi: z.string().describe("The character's alibi."),
      })
    )
    .describe("A list of all character alibis, whether true or false."),
  clues: z
    .array(
      z.object({
        description: z.string().describe('Description of the clue.'),
        relevance: z
          .string()
          .describe('How the clue relates to the murder.'),
      })
    )
    .describe('A list of clues scattered throughout the game.'),
  eventsChronology: z
    .array(z.string().describe('An event description.'))
    .describe('A chronological sequence of key events leading to the murder.'),
});

const RevealMurderResolutionInputSchema = z.object({
  gameScenario: GameScenarioSchema.describe(
    'The complete game scenario, including victim, killer, motives, alibis, clues, and event chronology.'
  ),
});
export type RevealMurderResolutionInput = z.infer<
  typeof RevealMurderResolutionInputSchema
>;

const RevealMurderResolutionOutputSchema = z.object({
  recapNarrative: z
    .string()
    .describe('A detailed narrative recap of how the murder unfolded.'),
  trueKillerName: z.string().describe('The name of the true killer.'),
});
export type RevealMurderResolutionOutput = z.infer<
  typeof RevealMurderResolutionOutputSchema
>;

export async function revealMurderResolution(
  input: RevealMurderResolutionInput
): Promise<RevealMurderResolutionOutput> {
  return revealMurderResolutionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'revealMurderResolutionPrompt',
  input: { schema: RevealMurderResolutionInputSchema },
  output: { schema: RevealMurderResolutionOutputSchema },
  prompt: `You are the master of ceremonies, revealing the shocking truth behind a complex murder mystery.

Based on the following game scenario, construct a dramatic and detailed narrative recap of the murder. The narrative should:
1.  Start by explicitly stating who the victim was and how they were found.
2.  Weave together the "true killer's" motive and method, integrating elements from the event chronology and clues.
3.  Explain how the murder was committed, including the specific actions taken by the killer.
4.  Subtly incorporate some of the character alibis and clues, revealing their true meaning or how they misled players.
5.  Build suspense as you lead to the grand reveal of the true killer.
6.  Conclude by definitively naming the true killer and summarizing the full story, ensuring all mysteries are unraveled.

Game Scenario Details:

Victim: {{{gameScenario.victim.name}}} - {{{gameScenario.victim.description}}}

True Killer: {{{gameScenario.trueKiller.name}}}
Killer's Motive: {{{gameScenario.trueKiller.motive}}}
Murder Method: {{{gameScenario.trueKiller.method}}}

Chronology of Events:
{{#each gameScenario.eventsChronology}}- {{{this}}}
{{/each}}

Alibis of All Characters:
{{#each gameScenario.allCharacterAlibis}}- {{{this.characterName}}}: {{{this.alibi}}}
{{/each}}

Scattered Clues:
{{#each gameScenario.clues}}- {{{this.description}}} (Relevance: {{{this.relevance}}})
{{/each}}

Now, reveal the full story of the murder, culminating in the naming of the true killer and explaining their actions.`,
});

const revealMurderResolutionFlow = ai.defineFlow(
  {
    name: 'revealMurderResolutionFlow',
    inputSchema: RevealMurderResolutionInputSchema,
    outputSchema: RevealMurderResolutionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate murder resolution narrative.');
    }
    return output;
  }
);
