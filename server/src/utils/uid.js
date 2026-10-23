import crypto from "crypto";

const MAX_TRIES = 10;

export const createUid = async (Model) => {
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const uid = String(crypto.randomInt(100000000, 1000000000));
    const taken = await Model.exists({ uid });
    if (!taken) return uid;
  }

  throw new Error("Could not generate a unique uid");
};
