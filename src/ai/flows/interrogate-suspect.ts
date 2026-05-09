'use server';
/**
 * @fileOverview A Genkit flow to handle suspect interrogation.
 *
 * - interrogateSuspect - A function that generates a suspect's response to a player's question.
 * - InterrogateSuspectInput - The input type for the interrogateSuspect function.
 * - InterrogateSuspectOutput - The return type for the interrogateSuspect function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterrogateSuspectInputSchema = z.object({
  mysteryScenario: z.any().describe('The complete mystery scenario object.'),
  suspectName: z.string().describe('The name of the suspect being interrogated.'),
  question: z.string().describe("The player's question."),
  previousConversation: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional().describe('The history of the interrogation.')
});
export type InterrogateSuspectInput = z.infer<typeof InterrogateSuspectInputSchema>;

const InterrogateSuspectOutputSchema = z.object({
  response: z.string().describe("The suspect's response to the question."),
  suspicionLevel: z.number().min(1).max(10).describe('A rating of how suspicious or defensive the suspect is being.')
});
export type InterrogateSuspectOutput = z.infer<typeof InterrogateSuspectOutputSchema>;

export async function interrogateSuspect(input: InterrogateSuspectInput): Promise<InterrogateSuspectOutput> {
  return interrogateSuspectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interrogateSuspectPrompt',
  input: {schema: InterrogateSuspectInputSchema},
  output: {schema: InterrogateSuspectOutputSchema},
  prompt: `You are playing a suspect in a murder mystery game called 'Knives Out'.

**Your Identity:**
You are {{{suspectName}}}.
Your details: {{#each mysteryScenario.suspects}}{{#if (eq name ../suspectName)}}{{{description}}}. Relationship to victim: {{{relationshipToVictim}}}. Alibi: {{{alibi}}}. Hidden motive: {{{hiddenMotive}}}. Is Killer: {{isKiller}}{{/if}}{{/each}}

**The Situation:**
A murder has occurred. The victim is {{{mysteryScenario.victim.name}}}, who died by {{{mysteryScenario.victim.causeOfDeath}}} in the {{{mysteryScenario.victim.locationOfDeath}}}.

**Your Task:**
Respond to the player's question in character. 
- If you are the killer, be defensive, evasive, or try to subtly shift blame while sticking to your alibi.
- If you are NOT the killer, be honest about your alibi, but you might be defensive about your hidden motive if pressed.
- Keep your response concise (2-3 sentences).
- Maintain an atmospheric, mysterious tone.

{{#if previousConversation}}
**Context of previous discussion:**
{{#each previousConversation}}
{{role}}: {{{content}}}
{{/each}}
{{/if}}

**Player's Question:**
{{{question}}}

Generate the response and a suspicion level (1-10) indicating how defensive or shifty you sound.`,
});

const interrogateSuspectFlow = ai.defineFlow(
  {
    name: 'interrogateSuspectFlow',
    inputSchema: InterrogateSuspectInputSchema,
    outputSchema: InterrogateSuspectOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate interrogation response.');
    }
    return output;
  }
);
