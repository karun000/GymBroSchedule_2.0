import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserRecords } from './records';

// -----------------------------------------------------------------------------
// API KEYS
// -----------------------------------------------------------------------------
// IMPORTANT: These keys have been exposed in source code/chat.
// Revoke them and create new keys before using this in a real app.
const GEMINI_API_KEY = 'AQ.Ab8RN6JLHJqBze0A96QTZnVnGwTAfiKve7xZfW8bVQd2iLLaTg';
const NVIDIA_NIM_API_KEY = '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';

// -----------------------------------------------------------------------------
// REQUEST TIMEOUT
// -----------------------------------------------------------------------------
// React Native's fetch has no built-in timeout — a dropped/stalled connection
// (DNS issue, firewall, flaky network) can otherwise hang far longer than a
// user will wait, or surface as a late, unclear "Network request failed".
// Wrapping fetch in an AbortController gives us a bounded, clearly-labeled
// failure instead.
// -----------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

// -----------------------------------------------------------------------------
// AI RESULT CACHE
// -----------------------------------------------------------------------------
// Gemini's free tier is quota-limited (20 requests/day on this key). Calling
// it fresh on every mount/refresh burns through that fast. We cache the last
// successful AI result together with a fingerprint of the underlying data —
// if the user's weight/PR data hasn't changed since the cached result was
// generated, we reuse it instead of calling the AI providers again.
// A forced refresh (forceRefresh: true) always bypasses the cache.
// -----------------------------------------------------------------------------

const AI_SUMMARY_CACHE_KEY = '@gymbro_ai_summary_cache';

const buildResultFingerprint = ({ goal, latestWeight, weightChange, prProgress }) =>
  [
    goal,
    latestWeight?.value ?? '',
    latestWeight?.dateLabel ?? '',
    weightChange ?? '',
    prProgress?.exerciseName ?? '',
    prProgress?.currentValue ?? '',
  ].join('|');

const readCachedSummary = async (fingerprint) => {
  try {
    const raw = await AsyncStorage.getItem(AI_SUMMARY_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.fingerprint === fingerprint && parsed?.result) {
      return parsed.result;
    }
  } catch (err) {
    console.warn('[AI Summary] Failed to read cache:', err);
  }
  return null;
};

const writeCachedSummary = async (fingerprint, result) => {
  try {
    await AsyncStorage.setItem(
      AI_SUMMARY_CACHE_KEY,
      JSON.stringify({ fingerprint, result })
    );
  } catch (err) {
    console.warn('[AI Summary] Failed to write cache:', err);
  }
};

// -----------------------------------------------------------------------------
// MODELS
// -----------------------------------------------------------------------------

// Use a currently supported Gemini model.
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const NVIDIA_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const roundNumber = (number, decimals = 1) => {
  if (!Number.isFinite(number)) return 0;

  return Number(number.toFixed(decimals));
};

const getDateValue = (record) => {
  const possibleValues = [
    record?.date,
    record?.measurementDate,
    record?.createdAt,
    record?.updatedAt,
    record?.timestamp,
  ];

  for (const value of possibleValues) {
    if (!value) continue;

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    if (value && typeof value.toDate === 'function') {
      return value.toDate().getTime();
    }
  }

  return 0;
};

const formatDate = (record) => {
  const time = getDateValue(record);

  if (!time) return '';

  try {
    return new Date(time).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

const getWeightValue = (record) => {
  const possibleFields = [
    record?.weight,
    record?.weightValue,
    record?.bodyWeight,
    record?.weightKg,
    record?.kg,
    record?.value,
  ];

  for (const value of possibleFields) {
    const number = toNumber(value);

    if (number !== null && number > 0) {
      return number;
    }
  }

  return null;
};

const getWeightUnit = (record) => {
  const unit =
    record?.weightUnit ??
    record?.unit ??
    record?.weight_unit;

  if (typeof unit === 'string' && unit.trim()) {
    return unit.trim().toLowerCase();
  }

  return 'kg';
};

const normalizeWeightRecord = (record) => {
  const value = getWeightValue(record);

  if (value === null) return null;

  return {
    id: record?.id,
    value,
    unit: getWeightUnit(record),
    time: getDateValue(record),
    dateLabel: formatDate(record),
  };
};

const getWeightHistory = (measurementRecords) => {
  if (!Array.isArray(measurementRecords)) {
    return [];
  }

  return measurementRecords
    .map(normalizeWeightRecord)
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
};

const getWeightTrend = (change) => {
  if (Math.abs(change) < 0.01) {
    return 'stable';
  }

  return change > 0 ? 'up' : 'down';
};

// -----------------------------------------------------------------------------
// LOCAL FALLBACK
// -----------------------------------------------------------------------------
// This is important.
//
// Even if BOTH AI providers fail, the user still receives a meaningful,
// factual summary generated from the real data.
//
// The fallback NEVER invents numbers.
// -----------------------------------------------------------------------------

const generateLocalSummary = ({
  goal,
  latestWeight,
  previousWeight,
  weightChange,
  weightTrend,
  prProgress,
  weightHistory,
}) => {
  const goalNames = {
    bulk: 'bulk',
    cut: 'cut',
    maintain: 'maintain',
  };

  const goalName = goalNames[goal] || 'maintain';

  if (!latestWeight) {
    return {
      progressSummary:
        `You're working toward your ${goalName} goal, but no weight measurement has been recorded yet.`,
      insights: [
        'Add a weight measurement to start tracking your weight trend.',
        'Your progress summary will become more detailed as more measurements are recorded.',
      ],
      provider: 'local',
    };
  }

  const unit = latestWeight.unit || 'kg';

  let progressSummary = '';
  const insights = [];

  // ---------------------------------------------------------------------------
  // BULK
  // ---------------------------------------------------------------------------

  if (goal === 'bulk') {
    if (weightTrend === 'up') {
      progressSummary =
        `Your weight is trending upward, which aligns with your bulk goal.`;

      insights.push(
        `Your latest recorded weight is ${latestWeight.value} ${unit}, up ${Math.abs(weightChange)} ${unit} from the previous measurement.`
      );

      insights.push(
        'Your recent weight history shows recovery after earlier fluctuations.'
      );
    } else if (weightTrend === 'down') {
      progressSummary =
        `Your weight is trending downward, which does not currently align with your bulk goal.`;

      insights.push(
        `Your latest recorded weight is ${latestWeight.value} ${unit}, down ${Math.abs(weightChange)} ${unit} from the previous measurement.`
      );

      insights.push(
        'Keep monitoring the trend across multiple measurements rather than judging progress from one entry.'
      );
    } else {
      progressSummary =
        `Your weight is currently stable, so your bulk progress may need more time to show a clear trend.`;

      insights.push(
        `Your latest recorded weight is ${latestWeight.value} ${unit}.`
      );

      insights.push(
        'Continue tracking measurements consistently to identify the longer-term trend.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // CUT
  // ---------------------------------------------------------------------------

  else if (goal === 'cut') {
    if (weightTrend === 'down') {
      progressSummary =
        `Your weight is trending downward, which aligns with your cut goal.`;

      insights.push(
        `Your latest recorded weight is ${latestWeight.value} ${unit}, down ${Math.abs(weightChange)} ${unit} from the previous measurement.`
      );

      insights.push(
        'Your recent measurements should be viewed as a trend rather than isolated changes.'
      );
    } else if (weightTrend === 'up') {
      progressSummary =
        `Your weight is trending upward, which does not currently align with your cut goal.`;

      insights.push(
        `Your latest recorded weight is ${latestWeight.value} ${unit}, up ${Math.abs(weightChange)} ${unit} from the previous measurement.`
      );

      insights.push(
        'Continue monitoring several measurements before drawing conclusions from short-term fluctuations.'
      );
    } else {
      progressSummary =
        `Your weight is currently stable, so there is no clear downward trend yet.`;

      insights.push(
        `Your latest recorded weight is ${latestWeight.value} ${unit}.`
      );

      insights.push(
        'Keep tracking consistently so the longer-term trend becomes clearer.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // MAINTAIN
  // ---------------------------------------------------------------------------

  else {
    if (weightTrend === 'stable') {
      progressSummary =
        `Your weight is currently stable, which aligns with your maintain goal.`;

      insights.push(
        `Your latest recorded weight is ${latestWeight.value} ${unit}.`
      );

      insights.push(
        'Your recent measurements do not show a meaningful change from the previous record.'
      );
    } else {
      progressSummary =
        `Your weight is moving ${weightTrend === 'up' ? 'upward' : 'downward'}, so it is not completely stable yet.`;

      insights.push(
        `Your latest recorded weight is ${latestWeight.value} ${unit}, ${weightChange > 0 ? 'up' : 'down'} ${Math.abs(weightChange)} ${unit} from the previous measurement.`
      );

      insights.push(
        'Look at the longer-term measurement history to determine whether this is a temporary fluctuation or a sustained trend.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // PR
  // ---------------------------------------------------------------------------

  if (
    prProgress &&
    prProgress.exerciseName &&
    prProgress.currentValue > 0
  ) {
    if (prProgress.changeValue > 0) {
      insights.push(
        `${prProgress.exerciseName} PR progress is up ${prProgress.changeValue} ${prProgress.unit}.`
      );
    } else if (prProgress.changeValue === 0) {
      insights.push(
        `${prProgress.exerciseName} is currently stable at ${prProgress.currentValue} ${prProgress.unit}.`
      );
    } else {
      insights.push(
        `${prProgress.exerciseName} is currently ${Math.abs(prProgress.changeValue)} ${prProgress.unit} below its starting recorded value.`
      );
    }
  }

  return {
    progressSummary,
    insights: insights.slice(0, 3),
    provider: 'local',
  };
};

// -----------------------------------------------------------------------------
// AI PROMPT
// -----------------------------------------------------------------------------

const buildAIPrompt = ({
  goal,
  latestWeight,
  previousWeight,
  weightChange,
  weightTrend,
  weightHistory,
  prProgress,
}) => {
  const historyForAI = weightHistory.slice(-7).map((item) => ({
    value: item.value,
    unit: item.unit,
    date: item.dateLabel,
  }));

  return `
You are the fitness progress assistant inside a gym tracking app.

USER GOAL:
${goal}

The numerical data below is factual and has already been calculated by the
application. You MUST NOT change, calculate, invent, or replace these values.

LATEST WEIGHT:
${latestWeight
    ? `${latestWeight.value} ${latestWeight.unit}`
    : 'No weight recorded'}

LATEST WEIGHT DATE:
${latestWeight?.dateLabel || 'Unknown'}

PREVIOUS WEIGHT:
${previousWeight
    ? `${previousWeight.value} ${previousWeight.unit}`
    : 'No previous weight recorded'}

WEIGHT CHANGE:
${previousWeight
    ? `${weightChange > 0 ? '+' : ''}${weightChange} ${latestWeight?.unit || 'kg'}`
    : 'Not available'}

WEIGHT TREND:
${weightTrend}

RECENT WEIGHT HISTORY:
${JSON.stringify(historyForAI, null, 2)}

PR PROGRESS:
${JSON.stringify(prProgress, null, 2)}

Write a concise progress summary.

Requirements:
- Consider the selected goal.
- Explain the weight direction.
- Explain whether that direction generally aligns with the goal.
- Consider the recent history.
- Mention PR progress only when useful.
- Never invent numbers.
- Never modify the supplied numbers.
- Do not discuss workout plans.
- Do not mention today's workout.
- Do not say "your progress data has been updated".
- Do not use markdown.
- Do not include any reasoning, thinking, or explanation outside the JSON.
- Return ONLY a single JSON object and nothing else — no preamble, no code fences.

The JSON object must have exactly these two keys:
- "progressSummary": one original sentence, written by you, summarizing the
  data above. This must be actual prose about THIS user's numbers — never a
  template, a description of what the field should contain, or any text
  wrapped in angle brackets or quotes-within-quotes.
- "insights": an array of exactly 3 original sentences, each a distinct
  factual insight written by you from the data above. Same rule: real
  sentences about this data, never a placeholder or a restatement of these
  instructions.

Do not include angle brackets, square brackets, or any part of these
instructions in your output. If you are unsure what to write, look again at
the LATEST WEIGHT, WEIGHT CHANGE, WEIGHT TREND, and PR PROGRESS values above
and describe them in your own words.
`;
};

// -----------------------------------------------------------------------------
// JSON EXTRACTION
// -----------------------------------------------------------------------------
// Reasoning models (like the NVIDIA Nemotron model used here) often emit a
// chain-of-thought "thinking" section before the actual answer. That thinking
// section frequently *echoes* the prompt, including the placeholder JSON
// format example ("One concise sentence.", "Useful factual insight.").
//
// A naive "first { ... last }" extraction picks up that placeholder example
// instead of the model's real answer. To avoid this we:
//   1. Strip <think>...</think> blocks if the model uses them.
//   2. Scan for every brace-balanced JSON object in the text (not just the
//      first/last braces).
//   3. Parse each candidate and keep the LAST one that both matches the
//      expected shape and is not the literal placeholder text.
// -----------------------------------------------------------------------------

// Known literal placeholder strings from earlier prompt versions, kept here
// in case any cached client/prompt still sends them.
const KNOWN_PLACEHOLDER_PHRASES = new Set([
  'one concise sentence.',
  'useful factual insight.',
  'your one-sentence summary here',
  'your first insight',
  'your second insight',
  'your third insight',
]);

// A value is "unfilled template" if it's an exact known placeholder, OR if
// it still contains template markup (angle brackets) the model was supposed
// to replace, e.g. "<your first insight>".
const looksLikeUnfilledTemplate = (value) => {
  const text = String(value || '').trim();
  if (!text) return true;

  const lower = text.toLowerCase();
  if (KNOWN_PLACEHOLDER_PHRASES.has(lower)) return true;

  // Strip a wrapping "<...>" and re-check against the known phrases, so
  // "<your first insight>" is caught even though the raw string differs
  // from the bare phrase above.
  const unwrapped = lower.replace(/^<+\s*/, '').replace(/\s*>+$/, '');
  if (KNOWN_PLACEHOLDER_PHRASES.has(unwrapped)) return true;

  // Any leftover angle-bracket markup at all is a strong signal the model
  // just echoed the instructions instead of writing real content.
  if (/[<>]/.test(text)) return true;

  return false;
};

const isPlaceholderResult = (candidate) => {
  if (looksLikeUnfilledTemplate(candidate?.progressSummary)) return true;

  const insights = Array.isArray(candidate?.insights) ? candidate.insights : [];
  if (insights.length > 0 && insights.every((item) => looksLikeUnfilledTemplate(item))) {
    return true;
  }

  return false;
};

const isValidSummaryShape = (candidate) =>
  candidate &&
  typeof candidate === 'object' &&
  typeof candidate.progressSummary === 'string' &&
  candidate.progressSummary.trim().length > 0;

// Find every top-level, brace-balanced {...} substring in text.
const findJsonObjectCandidates = (text) => {
  const candidates = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          candidates.push(text.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }

  return candidates;
};

const parseAIJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('AI returned empty text.');
  }

  // Strip explicit <think>...</think> reasoning blocks, if present.
  let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Remove markdown fences.
  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const candidates = findJsonObjectCandidates(cleaned);

  if (candidates.length === 0) {
    throw new Error('AI response did not contain valid JSON.');
  }

  // Walk candidates from LAST to FIRST — the real answer comes after any
  // "thinking"/prompt-echo text, so the last valid, non-placeholder object
  // is the one we want.
  let firstValidButPlaceholder = null;

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
    let parsed;
    try {
      parsed = JSON.parse(candidates[i]);
    } catch {
      continue;
    }

    if (!isValidSummaryShape(parsed)) continue;

    if (isPlaceholderResult(parsed)) {
      firstValidButPlaceholder = firstValidButPlaceholder || parsed;
      continue;
    }

    return parsed;
  }

  // Every valid candidate was the placeholder (model got cut off before the
  // real answer) — treat this as a failure so the caller falls back.
  if (firstValidButPlaceholder) {
    throw new Error('AI response only contained the placeholder JSON example.');
  }

  throw new Error('AI response did not contain valid JSON.');
};

// -----------------------------------------------------------------------------
// GEMINI
// -----------------------------------------------------------------------------

const generateGeminiSummary = async (payload) => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing.');
  }

  const prompt = buildAIPrompt(payload);

  const response = await fetchWithTimeout(
    `${GEMINI_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Gemini request failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text ?? '')
      .join('')
      .trim() || '';

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  const result = parseAIJson(text);

  return {
    ...result,
    provider: 'gemini',
  };
};

// -----------------------------------------------------------------------------
// NVIDIA NIM
// -----------------------------------------------------------------------------

const generateNvidiaNimSummary = async (payload) => {
  if (!NVIDIA_NIM_API_KEY) {
    throw new Error('NVIDIA API key is missing.');
  }

  const prompt = buildAIPrompt(payload);

  const requestBody = {
    model: NVIDIA_MODEL,

    messages: [
      // Nemotron reasoning models support this "detailed thinking" toggle
      // via a system message. Turning it off skips the long chain-of-thought
      // section entirely, so the response is just the JSON we asked for.
      // If this model build ignores the toggle, the increased max_tokens
      // below + the smarter parser still protect us.
      {
        role: 'system',
        content: 'detailed thinking off',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],

    temperature: 0.2,
    top_p: 0.95,
    // Reasoning models spend a large chunk of the token budget on
    // chain-of-thought before emitting the final JSON. 600 was cutting the
    // response off before it ever reached the answer, which caused the
    // parser to fall back to the placeholder example embedded in the prompt.
    max_tokens: 2048,

    stream: false,
  };

  const response = await fetchWithTimeout(NVIDIA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_NIM_API_KEY}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `NVIDIA NIM request failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  const message = data?.choices?.[0]?.message || {};

  // Some NIM deployments return the chain-of-thought in a separate
  // `reasoning_content` field and keep `content` clean — prefer that when
  // present, otherwise fall back to `content` (which may still contain
  // <think> tags that parseAIJson will strip).
  const text = message.content || message.reasoning_content || '';

  if (!text) {
    throw new Error('NVIDIA NIM returned an empty response.');
  }

  console.log('[AI] NVIDIA raw response:', text);

  const result = parseAIJson(text);

  return {
    ...result,
    provider: 'nvidia',
  };
};

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------

export const generateFitnessSummary = async ({
  goal = 'maintain',
  forceRefresh = false,
} = {}) => {
  try {
    // -------------------------------------------------------------------------
    // Fetch actual records
    // -------------------------------------------------------------------------

    const [
      exerciseRecords,
      measurementRecords,
      prRecords,
    ] = await Promise.all([
      fetchUserRecords('exerciseRecords', {
        forceRefresh,
      }),

      fetchUserRecords('measurementRecords', {
        forceRefresh,
      }),

      fetchUserRecords('prRecords', {
        forceRefresh,
      }),
    ]);

    // -------------------------------------------------------------------------
    // WEIGHT
    // -------------------------------------------------------------------------

    const weightHistory =
      getWeightHistory(measurementRecords);

    const latestWeight =
      weightHistory.length > 0
        ? weightHistory[weightHistory.length - 1]
        : null;

    const previousWeight =
      weightHistory.length > 1
        ? weightHistory[weightHistory.length - 2]
        : null;

    let weightChange = 0;

    if (latestWeight && previousWeight) {
      weightChange = roundNumber(
        latestWeight.value - previousWeight.value,
        1
      );
    }

    const weightTrend =
      getWeightTrend(weightChange);

    // -------------------------------------------------------------------------
    // PR PROGRESS
    // -------------------------------------------------------------------------

    const normalizedPrs =
      Array.isArray(prRecords)
        ? prRecords
            .map((record) => ({
              id: record?.id,

              exerciseName:
                record?.exerciseName ??
                record?.name ??
                record?.exercise ??
                'Exercise',

              value:
                toNumber(
                  record?.weight ??
                  record?.value ??
                  record?.weightValue ??
                  record?.maxWeight
                ) ?? 0,

              unit:
                record?.unit ?? 'kg',

              time:
                getDateValue(record),

              dateLabel:
                formatDate(record),
            }))
            .filter((record) => record.value > 0)
            .sort((a, b) => a.time - b.time)
        : [];

    let prProgress = {
      exerciseName: '',
      startValue: 0,
      currentValue: 0,
      unit: 'kg',
      changeValue: 0,
      periodLabel: '',
    };

    if (normalizedPrs.length > 0) {
      const grouped = {};

      normalizedPrs.forEach((record) => {
        const key =
          record.exerciseName.toLowerCase();

        if (!grouped[key]) {
          grouped[key] = [];
        }

        grouped[key].push(record);
      });

      let bestProgress = null;

      Object.values(grouped).forEach((records) => {
        if (records.length < 1) return;

        const first = records[0];

        const current =
          records[records.length - 1];

        const change =
          roundNumber(
            current.value - first.value,
            1
          );

        if (
          !bestProgress ||
          change > bestProgress.changeValue
        ) {
          bestProgress = {
            exerciseName:
              current.exerciseName,

            startValue:
              first.value,

            currentValue:
              current.value,

            unit:
              current.unit,

            changeValue:
              change,

            periodLabel:
              first.dateLabel &&
              current.dateLabel
                ? `${first.dateLabel} → ${current.dateLabel}`
                : '',
          };
        }
      });

      if (bestProgress) {
        prProgress = bestProgress;
      }
    }

    // -------------------------------------------------------------------------
    // PAYLOAD
    // -------------------------------------------------------------------------

    const aiPayload = {
      goal,
      latestWeight,
      previousWeight,
      weightChange,
      weightTrend,
      weightHistory,
      prProgress,
    };

    // -------------------------------------------------------------------------
    // LOCAL FALLBACK IS CREATED FIRST
    // -------------------------------------------------------------------------

    const localFallback =
      generateLocalSummary(aiPayload);

    // -------------------------------------------------------------------------
    // CHECK CACHE (skips both AI calls entirely when data hasn't changed)
    // -------------------------------------------------------------------------

    const fingerprint = buildResultFingerprint(aiPayload);

    let aiResult = null;
    let isFreshAiResult = false;

    if (!forceRefresh) {
      const cached = await readCachedSummary(fingerprint);
      if (cached) {
        console.log('[AI Summary] Using cached AI result — data unchanged.');
        aiResult = cached;
      }
    }

    // -------------------------------------------------------------------------
    // RUN GEMINI + NVIDIA SIMULTANEOUSLY (only if no usable cache hit)
    // -------------------------------------------------------------------------

    if (!aiResult) {
      try {
        console.log(
          '[AI Summary] Firing Gemini + NVIDIA simultaneously...'
        );

        aiResult = await Promise.any([
          generateGeminiSummary(aiPayload),
          generateNvidiaNimSummary(aiPayload),
        ]);

        console.log(
          `[AI Summary] Provider succeeded: ${aiResult.provider}`
        );
        isFreshAiResult = true;
      } catch (aggregateError) {
        console.warn(
          '[AI Summary] Both AI providers failed.'
        );

        console.warn(
          '[AI Summary] Gemini/NVIDIA errors:',
          aggregateError?.errors
        );

        // IMPORTANT:
        // Do NOT show a useless generic message.
        // Use factual locally-generated data instead.
        aiResult = localFallback;
      }
    }

    // -------------------------------------------------------------------------
    // VALIDATE AI RESULT
    // -------------------------------------------------------------------------

    if (
      !aiResult?.progressSummary ||
      typeof aiResult.progressSummary !== 'string' ||
      isPlaceholderResult(aiResult)
    ) {
      console.warn(
        '[AI Summary] Invalid or placeholder AI summary. Using local fallback.'
      );

      aiResult = localFallback;
    } else if (isFreshAiResult) {
      // Only cache genuine, validated, freshly-fetched AI provider results —
      // never the local fallback, never a placeholder, and never a result
      // that just came from the cache itself — so a future call keeps
      // retrying the AI providers instead of getting stuck on a bad summary.
      writeCachedSummary(fingerprint, aiResult);
    }

    const insights =
      Array.isArray(aiResult?.insights)
        ? aiResult.insights
            .filter(
              (item) =>
                typeof item === 'string' &&
                item.trim()
            )
            .slice(0, 3)
        : [];

    // -------------------------------------------------------------------------
    // FINAL RESULT
    // -------------------------------------------------------------------------

    return {
      latestWeight: {
        value:
          latestWeight?.value ?? 0,

        unit:
          latestWeight?.unit ?? 'kg',

        dateLabel:
          latestWeight?.dateLabel ?? '',
      },

      previousWeight:
        previousWeight
          ? {
              value:
                previousWeight.value,

              unit:
                previousWeight.unit,

              dateLabel:
                previousWeight.dateLabel,
            }
          : null,

      weightChange: {
        value:
          weightChange,

        unit:
          latestWeight?.unit ?? 'kg',

        trend:
          weightTrend,

        periodLabel:
          latestWeight &&
          previousWeight
            ? `${previousWeight.dateLabel} → ${latestWeight.dateLabel}`
            : 'No previous measurement',
      },

      prProgress,

      progressSummary:
        aiResult.progressSummary,

      insights,

      // Useful for debugging / UI.
      aiProvider:
        aiResult.provider || 'local',

      weightHistory:
        weightHistory.map((item) => ({
          value:
            item.value,

          unit:
            item.unit,

          dateLabel:
            item.dateLabel,
        })),

      exerciseRecordCount:
        Array.isArray(exerciseRecords)
          ? exerciseRecords.length
          : 0,

      generatedAt:
        new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      '[AI Summary] Error:',
      error
    );

    throw error;
  }
};