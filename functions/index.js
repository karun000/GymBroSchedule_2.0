const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { GoogleGenAI, Type } = require('@google/genai');

if (!admin.apps.length) {
  admin.initializeApp();
}

// Set with: firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret('AQ.Ab8RN6JLHJqBze0A96QTZnVnGwTAfiKve7xZfW8bVQd2iLLaTg');

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MODEL_NAME = 'gemini-3.6-flash';

// ─── Helpers ────────────────────────────────────────────────────────────────

const toIsoDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
};

const fetchCollection = async (uid, collectionName) => {
  const snapshot = await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .collection(collectionName)
    .get();

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

const sortByDateDesc = (records) =>
  [...records].sort((a, b) => {
    const timeA = Date.parse(toIsoDate(a.createdAt) ?? toIsoDate(a.updatedAt) ?? 0) || 0;
    const timeB = Date.parse(toIsoDate(b.createdAt) ?? toIsoDate(b.updatedAt) ?? 0) || 0;
    return timeB - timeA;
  });

// A cheap "did anything meaningful change" fingerprint, so a forced refresh
// with identical underlying data doesn't burn a Gemini call unnecessarily.
const buildDataSignature = ({ weights, prs, todayExerciseCount }) => {
  const latestWeight = weights[0];
  const topPr = prs[0];

  return [
    weights.length,
    latestWeight?.id ?? '',
    latestWeight?.weight ?? '',
    prs.length,
    topPr?.id ?? '',
    topPr?.weight ?? '',
    todayExerciseCount,
  ].join('|');
};

const buildPrompt = ({ weights, prs, todayExerciseCount }) => {
  const weightLines =
    weights
      .slice(0, 60)
      .map((w) => `- ${toIsoDate(w.createdAt) ?? toIsoDate(w.updatedAt) ?? 'unknown date'}: ${w.weight} ${w.unit || 'kg'}`)
      .join('\n') || 'No weight entries logged yet.';

  const prLines =
    prs
      .slice(0, 30)
      .map(
        (p) =>
          `- ${p.name || 'Unknown lift'}: ${p.weight} ${p.unit || 'kg'} x ${p.repMax || 1} (logged ${toIsoDate(p.createdAt) ?? toIsoDate(p.updatedAt) ?? 'unknown date'})`
      )
      .join('\n') || 'No PR entries logged yet.';

  return `You are a fitness coach assistant. Analyze this user's raw logged data and produce an honest, concise progress summary.

WEIGHT LOG (most recent first):
${weightLines}

PERSONAL RECORDS (most recent first):
${prLines}

TODAY'S SCHEDULED EXERCISES: ${todayExerciseCount}

Instructions:
- Compute the latest logged weight and how much it has changed compared to an earlier point in the log (pick a reasonable comparison window, e.g. ~30 days back, or the earliest entry if the log is shorter). Describe the comparison period briefly (e.g. "Since Jun 1").
- Identify one personal record that shows the clearest strength progress (compare the earliest logged value for that same lift to its most recent value). If there isn't enough history for any single lift, use the single most recent PR as both the start and current value.
- Write exactly 3 short, specific, encouraging insight sentences (max ~15 words each) based only on the actual numbers above. Do not invent data that isn't in the log.
- If there is genuinely no weight or PR data at all, set the relevant numeric fields to 0 and mention that in an insight instead of inventing numbers.
- Respond only with data matching the required JSON schema, nothing else.`;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    latestWeight: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER },
        unit: { type: Type.STRING },
        dateLabel: { type: Type.STRING },
      },
      required: ['value', 'unit', 'dateLabel'],
    },
    weightChange: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER },
        periodLabel: { type: Type.STRING },
      },
      required: ['value', 'periodLabel'],
    },
    prProgress: {
      type: Type.OBJECT,
      properties: {
        exerciseName: { type: Type.STRING },
        startValue: { type: Type.NUMBER },
        currentValue: { type: Type.NUMBER },
        unit: { type: Type.STRING },
      },
      required: ['exerciseName', 'startValue', 'currentValue', 'unit'],
    },
    insights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['latestWeight', 'weightChange', 'prProgress', 'insights'],
};

// ─── Cloud Function ─────────────────────────────────────────────────────────

exports.generateFitnessSummary = onCall(
  { secrets: [GEMINI_API_KEY], region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to get your AI summary.');
    }

    const uid = request.auth.uid;
    const forceRefresh = !!request.data?.forceRefresh;
    const todayExerciseCount = Number.isFinite(Number(request.data?.todayExerciseCount))
      ? Math.max(0, Math.trunc(Number(request.data.todayExerciseCount)))
      : 0;

    const cacheRef = admin.firestore().collection('users').doc(uid).collection('aiSummary').doc('latest');

    const [weightsRaw, prsRaw, cacheSnap] = await Promise.all([
      fetchCollection(uid, 'measurementRecords'),
      fetchCollection(uid, 'prRecords'),
      cacheRef.get(),
    ]);

    const weights = sortByDateDesc(weightsRaw);
    const prs = sortByDateDesc(prsRaw);
    const signature = buildDataSignature({ weights, prs, todayExerciseCount });

    // Serve cache when it's fresh, still matches the underlying data, and the
    // caller isn't explicitly forcing a regeneration (pull-to-refresh).
    if (!forceRefresh && cacheSnap.exists) {
      const cached = cacheSnap.data();
      const isFresh = cached?.generatedAt?.toMillis
        ? Date.now() - cached.generatedAt.toMillis() < CACHE_TTL_MS
        : false;

      if (isFresh && cached.signature === signature && cached.summary) {
        return { summary: cached.summary, cached: true };
      }
    }

    // No data at all yet — don't waste a Gemini call, just return a friendly placeholder.
    if (weights.length === 0 && prs.length === 0) {
      const emptySummary = {
        latestWeight: { value: 0, unit: 'kg', dateLabel: 'No data yet' },
        weightChange: { value: 0, periodLabel: 'No data yet' },
        prProgress: { exerciseName: 'No PRs yet', startValue: 0, currentValue: 0, unit: 'kg' },
        insights: [
          'Log a weight entry and a PR to unlock your AI summary.',
          'Your progress snapshot will appear here once you have data.',
          "Add today's workout results to get started.",
        ],
      };

      await cacheRef.set({
        summary: emptySummary,
        signature,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { summary: emptySummary, cached: false };
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: buildPrompt({ weights, prs, todayExerciseCount }),
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    let summary;
    try {
      summary = JSON.parse(response.text);
    } catch (error) {
      throw new HttpsError('internal', 'Could not parse the AI summary. Please try again.');
    }

    summary.todayPlan = { exerciseCount: todayExerciseCount };

    await cacheRef.set({
      summary,
      signature,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { summary, cached: false };
  }
);