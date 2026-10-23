import User from "../models/User.js";
import Item from "../models/Item.js";
import { createUid } from "./uid.js";

// Documents created before uids existed receive one when the server starts.
const backfillUids = async (model) => {
  const documentsWithoutUid = await model
    .find({ uid: { $exists: false } })
    .select("_id");
  let filledCount = 0;

  for (const document of documentsWithoutUid) {
    const uid = await createUid(model);
    // The native driver is needed because the uid field is immutable in
    // Mongoose updates, and this one-time backfill is the exception.
    await model.collection.updateOne(
      { _id: document._id },
      { $set: { uid } }
    );
    filledCount += 1;
  }

  return filledCount;
};

export const ensureUids = async () => {
  const usersFilled = await backfillUids(User);
  const itemsFilled = await backfillUids(Item);

  if (usersFilled + itemsFilled > 0) {
    console.log(`Filled uid on ${usersFilled} users and ${itemsFilled} items`);
  }
};
