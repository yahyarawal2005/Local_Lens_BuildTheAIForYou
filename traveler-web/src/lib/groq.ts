// ==============================================================================
// LocalLens Web - Groq AI Service (LocalLens Saathi Travel Companion & Optimizer)
// Direct translation of traveler-app's groq_itinerary_service.dart
// ==============================================================================

import axios from 'axios';
import { GroqOptimizationResult } from '@/types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const RECOGNIZED_INTERESTS = [
  'Beach',
  'Food',
  'Culture',
  'Adventure',
  'Nature',
  'Heritage',
  'Shopping',
  'Nightlife',
  'Photography',
  'Wellness',
  'Hidden Gems',
  'Local Experiences',
];

export const GroqService = {
  getApiKey(): string {
    return process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || '';
  },

  async analyzeRequest(params: {
    prompt: string;
    destination: string;
    currentInterests: string[];
    budget: number;
    durationHours: number;
    currentPlaceNames: string[];
    chatHistory?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    placesDetails?: Array<Record<string, any>>;
  }): Promise<GroqOptimizationResult> {
    const trimmed = params.prompt.trim();
    if (!trimmed) {
      return {
        reply: 'Namaste! 🙏 Please let me know what you would like to ask or change!',
        isInfoQuery: true,
        removeInterests: [],
        addInterests: [],
        shouldRegenerate: false,
        isRouteReorderOnly: false,
      };
    }

    const key = this.getApiKey();

    const stopsContext =
      params.placesDetails && params.placesDetails.length > 0
        ? params.placesDetails
            .map(
              (p, i) =>
                `${i + 1}. ${p.name || p.experience_name || `Stop ${i + 1}`} (${p.category || 'Experience'}, ${p.location || ''}) [Cost: ₹${p.price_inr ?? p.price ?? 0}, Time: ${p.time_window || ''}] - ${p.description || ''}`
            )
            .join('\n')
        : params.currentPlaceNames.map((n, i) => `${i + 1}. ${n}`).join('\n');

    const systemPrompt = `
You are LocalLens Saathi (लोकललेंस साथी) — an authentic, warm, deeply knowledgeable Indian local travel companion, guide, and itinerary assistant.
You speak with authentic Indian hospitality and warmth (using "Namaste 🙏", "Aapka Saathi", Indian cultural context, ₹ INR prices). You understand English, Hindi (हिन्दी), and Hinglish fluently, matching the traveler's language.

Current Trip State:
- Destination / City: ${params.destination}
- Current Interests: ${params.currentInterests.join(', ')}
- Stops in Current Itinerary:
${stopsContext}
- Budget: ₹${params.budget}
- Available Time: ${params.durationHours} hours

Your Dual Superpower:
1. 🏛️ INFORMATIONAL LOCAL GUIDE (Places, Heritage, Culture, Food & Secrets):
   - Whenever the traveler asks about ANY place, stop, history, culture, what to eat, street food, best photo spots, entry fees, timings, weather tips, dress codes, or local secrets.
   - For food: suggest specific Indian local delicacies (e.g. hot Vada Pav, cutting chai, Bun Maska, local thali, coastal curry, chaat).
   - "is_info_query": true, "should_regenerate": false, "remove_interests": [], "add_interests": [].

2. ⚡ TRIP OPTIMIZER & MODIFIER:
   - When the traveler asks to change, swap, add, or remove stops/interests (e.g., "swap food with beaches", "no food", "more adventure", "reduce budget to ₹2000", "fastest route"):
   - Categories: ${RECOGNIZED_INTERESTS.join(', ')}
   - If they want to regenerate/modify the itinerary: "should_regenerate": true, "is_info_query": false.
   - If they only want route sequence optimization: "is_route_reorder_only": true, "is_info_query": false.

Output STRICTLY a single JSON object matching this schema:
{
  "reply": "Your rich, engaging, informative or optimization response as LocalLens Saathi (use ₹ for currency)",
  "is_info_query": true,
  "remove_interests": [],
  "add_interests": [],
  "custom_notes": null,
  "updated_budget": null,
  "updated_duration_hours": null,
  "should_regenerate": false,
  "is_route_reorder_only": false
}
`;

    if (key) {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...(params.chatHistory || []).slice(-6),
        { role: 'user', content: trimmed },
      ];

      const models = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];
      for (const model of models) {
        try {
          const res = await axios.post(
            GROQ_URL,
            {
              model,
              messages,
              response_format: { type: 'json_object' },
              temperature: 0.4,
            },
            {
              headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          );

          const content = res.data?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const isInfo = Boolean(parsed.is_info_query);
            const explicitRegen = Boolean(parsed.should_regenerate);
            const hasChanges =
              (Array.isArray(parsed.add_interests) && parsed.add_interests.length > 0) ||
              (Array.isArray(parsed.remove_interests) && parsed.remove_interests.length > 0);

            return {
              reply: parsed.reply || 'Namaste! I am LocalLens Saathi. How can I guide you today?',
              isInfoQuery: isInfo,
              removeInterests: isInfo && !explicitRegen ? [] : parsed.remove_interests || [],
              addInterests: isInfo && !explicitRegen ? [] : parsed.add_interests || [],
              customNotes: parsed.custom_notes || null,
              updatedBudget: parsed.updated_budget ? Number(parsed.updated_budget) : null,
              updatedDurationHours: parsed.updated_duration_hours ? Number(parsed.updated_duration_hours) : null,
              shouldRegenerate: !isInfo && (explicitRegen || hasChanges),
              isRouteReorderOnly: Boolean(parsed.is_route_reorder_only),
            };
          }
        } catch (e) {
          console.warn(`Groq model ${model} failed, trying fallback:`, e);
        }
      }
    }

    return fallbackLocalParse(trimmed, params.currentInterests, params.destination, params.currentPlaceNames);
  },
};

function fallbackLocalParse(
  prompt: string,
  currentInterests: string[],
  destination: string,
  currentPlaceNames: string[]
): GroqOptimizationResult {
  const lower = prompt.toLowerCase();
  const removeList: string[] = [];
  const addList: string[] = [];
  let shouldRegen = false;
  let isReorderOnly = false;

  if (lower.includes('route') || lower.includes('order') || lower.includes('fastest') || lower.includes('shortest')) {
    isReorderOnly = true;
  }

  const isInfo =
    lower.includes('tell me') ||
    lower.includes('about') ||
    lower.includes('history') ||
    lower.includes('what is') ||
    lower.includes("what's") ||
    lower.includes('special') ||
    lower.includes('food to try') ||
    lower.includes('info') ||
    lower.includes('details') ||
    lower.includes('explain') ||
    lower.includes('famous') ||
    lower.includes('story') ||
    lower.includes('timing') ||
    lower.includes('entry') ||
    lower.includes('chai') ||
    lower.includes('snack');

  if (isInfo && !isReorderOnly) {
    const firstStop = currentPlaceNames.length > 0 ? currentPlaceNames[0] : destination;
    return {
      reply: `Namaste! 🙏 As your LocalLens Saathi, here is what makes ${firstStop} special:\n\n• 🏛️ Rich cultural & historical heritage with picturesque surroundings.\n• 🍛 Must-try eats: Fresh local street food, hot cutting chai, and savory snacks nearby!\n• 📸 Insider tip: Morning and sunset golden hours offer the most breathtaking views without heavy crowds.`,
      isInfoQuery: true,
      removeInterests: [],
      addInterests: [],
      shouldRegenerate: false,
      isRouteReorderOnly: false,
    };
  }

  const categoriesMap: Record<string, string[]> = {
    Food: ['food', 'eat', 'dining', 'restaurant', 'restaurants', 'cafe', 'dishes', 'snack', 'meals'],
    Beach: ['beach', 'beaches', 'sea', 'coastal', 'shore', 'ocean'],
    Adventure: ['adventure', 'trek', 'trekking', 'hike', 'hiking', 'climb', 'sports'],
    Heritage: ['heritage', 'fort', 'forts', 'monument', 'monuments', 'palace', 'history', 'caves'],
    Culture: ['culture', 'temple', 'temples', 'museum', 'museums', 'spiritual', 'religious'],
    Nature: ['nature', 'park', 'parks', 'garden', 'gardens', 'waterfall', 'waterfalls', 'wildlife', 'forest'],
    Shopping: ['shopping', 'market', 'markets', 'bazaar', 'bazaars', 'mall', 'malls'],
    Nightlife: ['nightlife', 'bar', 'bars', 'pub', 'pubs', 'club', 'clubs', 'lounge'],
    Wellness: ['wellness', 'spa', 'yoga', 'meditation'],
  };

  const negationPrefixes = [
    'dont need',
    "don't need",
    'dont want',
    "don't want",
    'do not need',
    'do not want',
    'no',
    'not need',
    'not want',
    'without',
    'remove',
    'skip',
    'exclude',
    'drop',
    'avoid',
    'stop',
    'delete',
  ];

  for (const [cat, syns] of Object.entries(categoriesMap)) {
    const allTerms = [cat.toLowerCase(), ...syns];
    const isNegated = allTerms.some((t) =>
      negationPrefixes.some((neg) => lower.includes(`${neg} ${t}`) || lower.includes(`${t} ${neg}`) || lower.includes(`replace ${t}`))
    );

    if (isNegated) {
      if (!removeList.includes(cat)) removeList.push(cat);
      shouldRegen = true;
    } else if (syns.some((s) => lower.includes(s))) {
      if (!addList.includes(cat) && !removeList.includes(cat)) {
        addList.push(cat);
        shouldRegen = true;
      }
    }
  }

  let reply = '';
  if (removeList.length > 0 && addList.length > 0) {
    reply = `Namaste! 🙏 Got it. I will exclude all ${removeList.join(', ')} experiences and add ${addList.join(', ')} instead. Regenerating fresh recommendations for you!`;
  } else if (removeList.length > 0) {
    reply = `Understood! I will ensure no ${removeList.join(', ')} items or experiences are included in your itinerary. Regenerating your fresh trip now!`;
  } else if (addList.length > 0) {
    reply = `Added ${addList.join(', ')} to your travel preferences. Let's find exciting new spots for you!`;
  } else if (isReorderOnly) {
    reply = 'Optimizing your itinerary route for the fastest travel sequence and minimum transit time!';
  } else {
    reply = `Namaste! 🙏 I've updated your trip preferences based on your note: "${prompt}". Let's refresh your itinerary!`;
    shouldRegen = true;
  }

  return {
    reply,
    isInfoQuery: false,
    removeInterests: removeList,
    addInterests: addList,
    customNotes: prompt,
    shouldRegenerate: shouldRegen,
    isRouteReorderOnly: isReorderOnly,
  };
}
