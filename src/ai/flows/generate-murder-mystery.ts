'use server';
/**
 * @fileOverview A Genkit flow for procedurally generating a unique murder mystery scenario.
 *
 * - generateMurderMystery - A function that generates the murder mystery scenario.
 * - GenerateMurderMysteryInput - The input type for the generateMurderMystery function.
 * - GenerateMurderMysteryOutput - The return type for the generateMurderMystery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMurderMysteryInputSchema = z.object({
  setting: z.string().optional().describe("An optional description of the game's setting to influence the mystery generation."),
});
export type GenerateMurderMysteryInput = z.infer<typeof GenerateMurderMysteryInputSchema>;

const GenerateMurderMysteryOutputSchema = z.object({
  victim: z.object({
    name: z.string().describe("The victim's name."),
    description: z.string().describe("A brief description of the victim's personality and role among the friends."),
    causeOfDeath: z.string().describe("The detailed cause of the victim's death."),
    timeOfDeath: z.string().describe("The estimated time the victim died (e.g., 'between 10:00 PM and 11:00 PM')."),
    locationOfDeath: z.string().describe("The specific location where the victim's body was found."),
    fatalWound: z.string().describe("Description of the fatal wound."),
  }).describe("Details about the victim and their death."),
  suspects: z.array(z.object({
    name: z.string().describe("The suspect's name."),
    description: z.string().describe("A brief description of the suspect's personality and their relationship with the victim and other friends."),
    backstorySummary: z.string().describe("A brief summary of the suspect's backstory relevant to the mystery."),
    alibi: z.string().describe("The suspect's alibi for the time of death."),
    hiddenMotive: z.string().describe("The suspect's hidden motive to harm the victim."),
    relationshipToVictim: z.string().describe("The nature of the suspect's relationship to the victim."),
    isKiller: z.boolean().describe("True if this suspect is the killer, false otherwise. Exactly one suspect must be the killer."),
  })).min(6).max(6).describe("An array of 6 suspects, one of whom is the killer."),
  clues: z.array(z.string().describe("A subtle piece of evidence or information related to the murder, that players can discover and piece together to solve the mystery.")).min(3).max(5).describe("An array of subtle clues scattered around the scene, pointing towards the killer but not overtly."),
  killerRevelation: z.string().describe("A detailed narrative revealing how the killer committed the murder, their true motive, and how they evaded initial suspicion. This should be a complete explanation, only to be revealed at the end of the game."),
});
export type GenerateMurderMysteryOutput = z.infer<typeof GenerateMurderMysteryOutputSchema>;

export async function generateMurderMystery(input: GenerateMurderMysteryInput): Promise<GenerateMurderMysteryOutput> {
  return generateMurderMysteryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMurderMysteryPrompt',
  input: {schema: GenerateMurderMysteryInputSchema},
  output: {schema: GenerateMurderMysteryOutputSchema},
  prompt: `You are a master storyteller and game designer for a murder mystery game called 'Knives Out'.
Your task is to craft a unique, compelling, and challenging murder scenario involving 7 friends, where one is the victim and one of the remaining six is the killer.

Generate the following elements for the mystery:
1.  **Victim Details**: Create a victim with a name, description, a specific cause of death, time of death, location of death, and a description of the fatal wound.
2.  **Suspects**: Create 6 distinct suspects (roles for the 6 players). For each suspect, provide:
    *   A unique name.
    *   A brief description of their personality and relationship dynamics with the victim and other friends.
    *   A brief backstory summary that hints at potential conflict or connection to the victim.
    *   A plausible alibi for the time of death.
    *   A hidden motive to harm the victim.
    *   Their relationship to the victim.
    *   Crucially, exactly one of these suspects **must** be the true killer. For the killer, their alibi should be cleverly constructed to initially deflect suspicion, and their motive should be the primary one leading to the murder.
3.  **Subtle Clues**: Generate 3 to 5 subtle clues that players can discover. These clues should logically point towards the true killer without being obvious.
4.  **Killer Revelation**: A complete narrative explanation detailing how the killer committed the murder.

The overall tone should be dark, mysterious, and intriguing.
Ensure the alibis, motives, and clues are interconnected and create a challenging puzzle for the players.

{{#if setting}}
Consider the following setting for the mystery: {{{setting}}}
{{/if}}

Generate the output in JSON format, strictly adhering to the provided schema.`,
});

const generateMurderMysteryFlow = ai.defineFlow(
  {
    name: 'generateMurderMysteryFlow',
    inputSchema: GenerateMurderMysteryInputSchema,
    outputSchema: GenerateMurderMysteryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate murder mystery output.');
    }
    const killerCount = output.suspects.filter(s => s.isKiller).length;
    if (killerCount !== 1) {
      throw new Error('LLM did not produce exactly one killer as requested.');
    }
    return output;
  }
);
