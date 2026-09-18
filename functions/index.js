const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { validatePayload, buildRequest, parseSummary, fingerprint } = require('./summary');

if (!admin.apps.length) admin.initializeApp();
const NVIDIA_API_KEY = defineSecret('NVIDIA_API_KEY');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

exports.generateFitnessSummary = onCall(
  { secrets: [NVIDIA_API_KEY], region: 'us-central1', timeoutSeconds: 3600, maxInstances: 10 },
  async request => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to get your AI summary.');
    let payload;
    try { payload = validatePayload(request.data?.payload); }
    catch { throw new HttpsError('invalid-argument', 'Invalid summary data.'); }

    const signature = fingerprint(payload);
    const cacheRef = admin.firestore().collection('users').doc(request.auth.uid).collection('aiSummary').doc('latest');
    const token = require('node:crypto').randomUUID();
    const cachedSummary = await admin.firestore().runTransaction(async transaction => {
      const snapshot = await transaction.get(cacheRef);
      const cached = snapshot.data();
      const age = Date.now() - (cached?.generatedAt?.toMillis?.() ?? 0);
      if (cached?.signature === signature && cached.summary && age < CACHE_TTL_MS
          && (!request.data?.forceRefresh || age < 30000)) return cached.summary;
      if (cached?.requestStartedAt && Date.now() - cached.requestStartedAt < 20000) {
        throw new HttpsError('resource-exhausted', 'A summary is already being generated. Please try again shortly.');
      }
      transaction.set(cacheRef, { requestStartedAt: Date.now(), requestToken: token }, { merge: true });
      return null;
    });
    if (cachedSummary) return { summary: cachedSummary, cached: true };

    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${NVIDIA_API_KEY.value()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequest(payload)),
      });
      if (!response.ok) throw new Error(`NVIDIA HTTP ${response.status}`);
      const data = await response.json();
      const choice = data?.choices?.[0];
      if (choice?.finish_reason !== 'stop') throw new Error('Incomplete AI response');
      const summary = parseSummary(choice.message.content);
      await cacheRef.set({ summary, signature, generatedAt: admin.firestore.FieldValue.serverTimestamp(), requestStartedAt: 0, requestToken: null });
      return { summary, cached: false };
    } catch (error) {
      // Never log the request payload, authorization header, or provider response.
      console.warn('NVIDIA summary failed', error?.name ?? 'Error');
      throw new HttpsError('unavailable', 'AI summary is temporarily unavailable.');
    } finally {
      await admin.firestore().runTransaction(async transaction => {
        const snapshot = await transaction.get(cacheRef);
        if (snapshot.data()?.requestToken === token) {
          transaction.update(cacheRef, { requestStartedAt: 0, requestToken: null });
        }
      });
    }
  }
);
