// Region to TLD mapping for PingOne API endpoints
export const regionToTld = {
  NA: 'com', // North America (default)
  CA: 'ca',
  EU: 'eu',
  AU: 'com.au',
  SG: 'sg',
  AP: 'asia'
};

export function getTldForRegion(region) {
  if (!region) return 'com';
  const normalized = region.toUpperCase();
  if (regionToTld[normalized]) return regionToTld[normalized];
  // fallback for common aliases
  if (normalized === 'NORTHAMERICA') return 'com';
  if (normalized === 'CANADA') return 'ca';
  if (normalized === 'EUROPE' || normalized === 'EU') return 'eu';
  if (normalized === 'AUSTRALIA' || normalized === 'AU') return 'com.au';
  if (normalized === 'SINGAPORE' || normalized === 'SG') return 'sg';
  if (normalized === 'ASIAPACIFIC' || normalized === 'AP' || normalized === 'APAC') return 'asia';
  return 'com';
}
