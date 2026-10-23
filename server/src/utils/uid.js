import crypto from "crypto";

const MAX_TRIES = 10;

// Nine random digits. A database check catches the rare collision.
export const createUid = async (model) => {
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const uid = String(crypto.randomInt(100000000, 1000000000));
    const uidInUse = await model.exists({ uid });
    if (!uidInUse) return uid;
  }

  throw new Error("Could not generate a unique uid");
};
