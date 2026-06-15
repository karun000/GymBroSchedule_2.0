const SHARE_URL_PREFIX = 'gymbro://import-schedule';
const FIELD_SEPARATOR = '~';
const RECORD_SEPARATOR = '.';

const normalizeExerciseForShare = (exercise) => [
  exercise?.name ?? '',
  exercise?.sets ?? '',
  exercise?.reps ?? '',
  exercise?.muscleGroup ?? '',
  exercise?.equipment ?? '',
  exercise?.dayOfWeek ?? '',
  exercise?.week ?? '',
  exercise?.order ?? '',
];

const encodeField = (value) =>
  encodeURIComponent(String(value))
    .replace(/\./g, '%2E')
    .replace(/~/g, '%7E');

const decodeField = (value) => decodeURIComponent(value || '');

const getQueryParam = (url, name) => {
  const [, queryString = ''] = String(url || '').split('?');

  return queryString
    .split('&')
    .map((entry) => entry.split('='))
    .find(([key]) => key === name)?.[1];
};

const findShareUrl = (value) =>
  String(value || '').match(/gymbro:\/\/import-schedule[^\s<>"']+/i)?.[0]?.replace(/[),.]+$/, '');

export const buildCompactScheduleUrl = (exercises) => {
  const compactSchedule = [
    'v1',
    ...exercises.map((exercise) =>
      normalizeExerciseForShare(exercise).map(encodeField).join(FIELD_SEPARATOR)
    ),
  ].join(RECORD_SEPARATOR);

  return `${SHARE_URL_PREFIX}?n=${exercises.length}&c=${compactSchedule}`;
};

export const extractScheduleImportFromText = (value) => {
  const matchedUrl = findShareUrl(value);

  if (!matchedUrl) {
    return null;
  }

  const compactParam = getQueryParam(matchedUrl, 'c');

  if (compactParam) {
    const expectedCount = Number(getQueryParam(matchedUrl, 'n'));
    const [version, ...records] = compactParam.split(RECORD_SEPARATOR);

    if (version !== 'v1' || records.length === 0) {
      return null;
    }

    return {
      type: 'inline',
      expectedCount: Number.isFinite(expectedCount) ? expectedCount : records.length,
      exercises: records.map((record, index) => {
        const [name, sets, reps, muscleGroup, equipment, dayOfWeek, week, order] = record
          .split(FIELD_SEPARATOR)
          .map(decodeField);
        const parsedSets = Number(sets);
        const parsedWeek = Number(week);
        const parsedOrder = Number(order);

        return {
          name,
          sets: Number.isFinite(parsedSets) ? parsedSets : sets,
          reps,
          muscleGroup,
          equipment,
          dayOfWeek,
          week: Number.isFinite(parsedWeek) && parsedWeek > 0 ? parsedWeek : 1,
          order: Number.isFinite(parsedOrder) ? parsedOrder : index,
        };
      }),
    };
  }

  const dataParam = getQueryParam(matchedUrl, 'data');

  if (dataParam) {
    try {
      const schedule = JSON.parse(decodeURIComponent(dataParam));

      return {
        type: 'inline',
        expectedCount: Array.isArray(schedule?.exercises) ? schedule.exercises.length : undefined,
        exercises: schedule?.exercises,
      };
    } catch (error) {
      return null;
    }
  }

  const shareId = matchedUrl.match(/^gymbro:\/\/import-schedule\/([^/?#]+)/i)?.[1];

  return shareId ? { type: 'cloud', shareId: decodeURIComponent(shareId) } : null;
};
