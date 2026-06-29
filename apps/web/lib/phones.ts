// Curated catalogue of popular phones (India) with their storage variants.
// Representative dataset for the exchange smart-picker — extend as needed.

export interface PhoneModel {
  name: string;
  variants: string[]; // RAM/storage options
}
export interface PhoneBrand {
  brand: string;
  models: PhoneModel[];
}

const S = (...v: string[]) => v;

export const PHONES: PhoneBrand[] = [
  {
    brand: 'Samsung',
    models: [
      { name: 'Galaxy S24 Ultra', variants: S('12GB/256GB', '12GB/512GB', '12GB/1TB') },
      { name: 'Galaxy S24+', variants: S('12GB/256GB', '12GB/512GB') },
      { name: 'Galaxy S24', variants: S('8GB/128GB', '8GB/256GB') },
      { name: 'Galaxy S23 Ultra', variants: S('12GB/256GB', '12GB/512GB') },
      { name: 'Galaxy Z Fold5', variants: S('12GB/256GB', '12GB/512GB') },
      { name: 'Galaxy Z Flip5', variants: S('8GB/256GB', '8GB/512GB') },
      { name: 'Galaxy A55 5G', variants: S('8GB/128GB', '8GB/256GB', '12GB/256GB') },
      { name: 'Galaxy A35 5G', variants: S('6GB/128GB', '8GB/256GB') },
      { name: 'Galaxy A15 5G', variants: S('4GB/128GB', '6GB/128GB', '8GB/256GB') },
      { name: 'Galaxy M35 5G', variants: S('6GB/128GB', '8GB/128GB') },
    ],
  },
  {
    brand: 'Apple',
    models: [
      { name: 'iPhone 15 Pro Max', variants: S('256GB', '512GB', '1TB') },
      { name: 'iPhone 15 Pro', variants: S('128GB', '256GB', '512GB') },
      { name: 'iPhone 15 Plus', variants: S('128GB', '256GB') },
      { name: 'iPhone 15', variants: S('128GB', '256GB', '512GB') },
      { name: 'iPhone 14 Pro Max', variants: S('128GB', '256GB', '512GB') },
      { name: 'iPhone 14', variants: S('128GB', '256GB') },
      { name: 'iPhone 13', variants: S('128GB', '256GB') },
      { name: 'iPhone 12', variants: S('64GB', '128GB', '256GB') },
      { name: 'iPhone SE (2022)', variants: S('64GB', '128GB') },
    ],
  },
  {
    brand: 'OnePlus',
    models: [
      { name: 'OnePlus 12', variants: S('12GB/256GB', '16GB/512GB') },
      { name: 'OnePlus 12R', variants: S('8GB/128GB', '16GB/256GB') },
      { name: 'OnePlus 11', variants: S('8GB/128GB', '16GB/256GB') },
      { name: 'OnePlus Nord 4', variants: S('8GB/128GB', '12GB/256GB') },
      { name: 'OnePlus Nord CE4', variants: S('8GB/128GB', '8GB/256GB') },
    ],
  },
  {
    brand: 'Xiaomi',
    models: [
      { name: 'Xiaomi 14', variants: S('12GB/256GB', '12GB/512GB') },
      { name: 'Redmi Note 13 Pro+', variants: S('8GB/256GB', '12GB/512GB') },
      { name: 'Redmi Note 13 Pro', variants: S('8GB/128GB', '8GB/256GB') },
      { name: 'Redmi Note 13', variants: S('6GB/128GB', '8GB/256GB') },
      { name: 'Redmi 13C', variants: S('4GB/128GB', '6GB/128GB') },
    ],
  },
  {
    brand: 'Poco',
    models: [
      { name: 'Poco X6 Pro', variants: S('8GB/256GB', '12GB/512GB') },
      { name: 'Poco X6', variants: S('8GB/256GB', '12GB/256GB') },
      { name: 'Poco F6', variants: S('8GB/256GB', '12GB/512GB') },
      { name: 'Poco M6 Pro', variants: S('6GB/128GB', '8GB/256GB') },
    ],
  },
  {
    brand: 'Realme',
    models: [
      { name: 'Realme 12 Pro+', variants: S('8GB/256GB', '12GB/512GB') },
      { name: 'Realme 12 Pro', variants: S('8GB/128GB', '8GB/256GB') },
      { name: 'Realme Narzo 70 Pro', variants: S('8GB/128GB', '8GB/256GB') },
      { name: 'Realme C67', variants: S('6GB/128GB', '8GB/256GB') },
    ],
  },
  {
    brand: 'Vivo',
    models: [
      { name: 'Vivo X100 Pro', variants: S('12GB/256GB', '16GB/512GB') },
      { name: 'Vivo V30 Pro', variants: S('8GB/256GB', '12GB/512GB') },
      { name: 'Vivo V30', variants: S('8GB/128GB', '8GB/256GB') },
      { name: 'Vivo T3 5G', variants: S('8GB/128GB', '8GB/256GB') },
    ],
  },
  {
    brand: 'iQOO',
    models: [
      { name: 'iQOO 12', variants: S('12GB/256GB', '16GB/512GB') },
      { name: 'iQOO Neo 9 Pro', variants: S('8GB/128GB', '12GB/256GB') },
      { name: 'iQOO Z9', variants: S('8GB/128GB', '8GB/256GB') },
    ],
  },
  {
    brand: 'Oppo',
    models: [
      { name: 'Oppo Reno 11 Pro', variants: S('12GB/256GB', '12GB/512GB') },
      { name: 'Oppo Reno 11', variants: S('8GB/128GB', '8GB/256GB') },
      { name: 'Oppo F25 Pro', variants: S('8GB/128GB', '8GB/256GB') },
    ],
  },
  {
    brand: 'Google',
    models: [
      { name: 'Pixel 8 Pro', variants: S('12GB/128GB', '12GB/256GB', '12GB/512GB') },
      { name: 'Pixel 8', variants: S('8GB/128GB', '8GB/256GB') },
      { name: 'Pixel 7a', variants: S('8GB/128GB') },
    ],
  },
  {
    brand: 'Nothing',
    models: [
      { name: 'Nothing Phone (2)', variants: S('8GB/128GB', '12GB/256GB') },
      { name: 'Nothing Phone (2a)', variants: S('8GB/128GB', '12GB/256GB') },
    ],
  },
  {
    brand: 'Motorola',
    models: [
      { name: 'Motorola Edge 50 Pro', variants: S('8GB/256GB', '12GB/512GB') },
      { name: 'Moto G84 5G', variants: S('8GB/128GB', '12GB/256GB') },
      { name: 'Moto G64 5G', variants: S('8GB/128GB', '12GB/256GB') },
    ],
  },
  {
    brand: 'Other',
    models: [{ name: 'Other / not listed', variants: S('—') }],
  },
];

// 5–6 important condition questions used to refine the buyback valuation.
export interface ExchangeQuestion {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export const EXCHANGE_QUESTIONS: ExchangeQuestion[] = [
  {
    key: 'power',
    label: '1. Does the phone switch on & work normally?',
    options: [
      { value: 'works', label: 'Yes, fully working' },
      { value: 'issues', label: 'Switches on but has issues' },
      { value: 'dead', label: 'Does not switch on' },
    ],
  },
  {
    key: 'screen',
    label: '2. Screen / display condition',
    options: [
      { value: 'flawless', label: 'Flawless' },
      { value: 'scratches', label: 'Minor scratches' },
      { value: 'cracked', label: 'Cracked / spots' },
    ],
  },
  {
    key: 'body',
    label: '3. Body / back condition',
    options: [
      { value: 'mint', label: 'Like new' },
      { value: 'used', label: 'Normal wear / scuffs' },
      { value: 'damaged', label: 'Dents / cracked back' },
    ],
  },
  {
    key: 'battery',
    label: '4. Battery health',
    options: [
      { value: 'high', label: 'Above 85%' },
      { value: 'mid', label: '80–85%' },
      { value: 'low', label: 'Below 80% / replaced' },
    ],
  },
  {
    key: 'faults',
    label: '5. Any functional faults?',
    options: [
      { value: 'none', label: 'None' },
      { value: 'camera', label: 'Camera' },
      { value: 'audio', label: 'Speaker / mic' },
      { value: 'charging', label: 'Charging / port' },
      { value: 'biometrics', label: 'Fingerprint / Face' },
    ],
  },
  {
    key: 'accessories',
    label: '6. Bill, box & accessories',
    options: [
      { value: 'all', label: 'Bill + box + charger' },
      { value: 'bill', label: 'Bill only' },
      { value: 'none', label: 'None' },
    ],
  },
];

// Map the answers to an overall condition tier (drives the AI valuation).
export function deriveCondition(answers: Record<string, string>): string {
  if (answers.power === 'dead' || answers.screen === 'cracked') return 'poor';
  if (
    answers.body === 'damaged' ||
    answers.battery === 'low' ||
    (answers.faults && answers.faults !== 'none') ||
    answers.power === 'issues'
  )
    return 'fair';
  if (
    answers.screen === 'flawless' &&
    answers.body === 'mint' &&
    answers.battery === 'high' &&
    answers.accessories === 'all'
  )
    return 'like new';
  return 'good';
}
