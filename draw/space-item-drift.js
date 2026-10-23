// Shared drop speed for C weapons and GAS, in world pixels per second.
export const ITEM_DRIFT_SPEED=Object.freeze({min:350,max:520});
export const randomItemDriftSpeed=(rng=Math.random)=>ITEM_DRIFT_SPEED.min+rng()*(ITEM_DRIFT_SPEED.max-ITEM_DRIFT_SPEED.min);
