export const SEA_RATE_PER_CBM = 450; // USD
export const AIR_RATE_PER_KG = 14.00; // USD
export const USD_TO_TZS_RATE = 2648.26; // Exchange rate

export const safeParseNum = (val: any): number => {
  const parsed = parseFloat(val);
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
};

export const calculateSeaFreight = (l: number, w: number, h: number) => {
  const length = safeParseNum(l), width = safeParseNum(w), height = safeParseNum(h);
  if (length <= 0 || width <= 0 || height <= 0) return { cbm: 0, costUsd: 0, costTzs: 0 };
  
  const cbm = (length * width * height) / 1000000;
  const costUsd = cbm * SEA_RATE_PER_CBM;
  const costTzs = costUsd * USD_TO_TZS_RATE;
  
  return { 
    cbm: Number(cbm.toFixed(4)), 
    costUsd: Number(costUsd.toFixed(2)),
    costTzs: Number(costTzs.toFixed(0))
  };
};

// Air freight is strictly based on Actual Weight (KG)
export const calculateAirFreight = (actualWeight: number) => {
  const weight = safeParseNum(actualWeight);
  if (weight <= 0) return { weight: 0, costUsd: 0, costTzs: 0 };

  const costUsd = weight * AIR_RATE_PER_KG;
  const costTzs = costUsd * USD_TO_TZS_RATE;
  
  return { 
    weight: Number(weight.toFixed(2)), 
    costUsd: Number(costUsd.toFixed(2)),
    costTzs: Number(costTzs.toFixed(0))
  };
};
