/**
 * Application Constants
 */

const partner1Name = process.env.REACT_APP_PARTNER_1_NAME || 'Imran Shah';
const partner2Name = process.env.REACT_APP_PARTNER_2_NAME || 'Raza Abbas';

export const PARTNERS = {
  PARTNER_1: `Partner1 (${partner1Name})`,
  PARTNER_2: `Partner2 (${partner2Name})`
};

export const PARTNER_OPTIONS = [
  { value: PARTNERS.PARTNER_1, label: PARTNERS.PARTNER_1 },
  { value: PARTNERS.PARTNER_2, label: PARTNERS.PARTNER_2 }
];

const constants = {
  PARTNERS,
  PARTNER_OPTIONS
};

export default constants;
