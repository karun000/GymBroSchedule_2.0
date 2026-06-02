export const WEEKS = [
  { id: 1, label: 'W1' },
  { id: 2, label: 'W2' },
  { id: 3, label: 'W3' },
  { id: 4, label: 'W4' },
  { id: 5, label: 'W5' },
];

export const HEIGHT_UNITS = ['cm', 'in', 'ft'];
export const WEIGHT_UNITS = ['lbs', 'kg'];
export const BODY_PART_UNITS = ['cm', 'in'];

export const BODY_PARTS = [
  { key: 'chest',    label: 'Chest' },
  { key: 'waist',    label: 'Waist' },
  { key: 'hips',     label: 'Hips' },
  { key: 'back',    label: 'Back' },
  { key: 'bicepL',   label: 'Bicep (L)' },
  { key: 'bicepR',   label: 'Bicep (R)' },
  { key: 'forearmsL',   label: 'Forearms (L)' },
  { key: 'forearmsR',   label: 'Forearms (R)' },
  { key: 'thighL',   label: 'Thigh (L)' },
  { key: 'thighR',   label: 'Thigh (R)' },
  {key: 'calvesL',   label: 'Calves (L)'},
  {key: 'calvesR',   label: 'Calves (R)'},

];

export const INITIAL_MEASUREMENTS = {
  chest:  { value: '102', unit: 'in' },
  waist:  { value: '85',  unit: 'in' },
  hips:   { value: '100', unit: 'in' },
  hipsR:  { value: '100', unit: 'in' },
  bicepL: { value: '35',  unit: 'in' },
  bicepR: { value: '35',  unit: 'in' },
  thighL: { value: '35',  unit: 'in' },
  thighR: { value: '35',  unit: 'in' },
  calvesL: { value: '35',  unit: 'in' },
  calvesR: { value: '35',  unit: 'in' },
  forearmsL: { value: '25',  unit: 'in' },
  forearmsR: { value: '25',  unit: 'in' },
  back: { value: '45',  unit: 'in' },
};
