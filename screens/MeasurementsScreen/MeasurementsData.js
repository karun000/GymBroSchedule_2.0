export const WEEKS = [
  { id: 1, label: 'W1' },
  { id: 2, label: 'W2' },
  { id: 3, label: 'W3' },
  { id: 4, label: 'W4' },
  { id: 5, label: 'W5' },
];

export const HEIGHT_UNITS = ['cm', 'in'];
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
  chest:  { value: '102', unit: 'cm' },
  waist:  { value: '85',  unit: 'cm' },
  hips:   { value: '100', unit: 'cm' },
  hipsR:  { value: '100', unit: 'cm' },
  bicepL: { value: '35',  unit: 'cm' },
  bicepR: { value: '35',  unit: 'cm' },
  thighL: { value: '35',  unit: 'cm' },
  thighR: { value: '35',  unit: 'cm' },
  calvesL: { value: '35',  unit: 'cm' },
  calvesR: { value: '35',  unit: 'cm' },
  forearmsL: { value: '25',  unit: 'cm' },
  forearmsR: { value: '25',  unit: 'cm' },
  back: { value: '45',  unit: 'cm' },
};
