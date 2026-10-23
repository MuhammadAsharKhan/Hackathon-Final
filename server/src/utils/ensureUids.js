import User from "../models/User.js";
import Item from "../models/Item.js";
import { createUid } from "./uid.js";

const backfill = async (Model) => {
  const documents = await Model.find({ uid: { $exists: false } }).select("_id");
  let filled = 0;

  for (const document of documents) {
    const uid = await createUid(Model);
    await Model.updateOne({ _id: document._id }, { $set: { uid } });
    filled += 1;
  }

  return filled;
};

export const ensureUids = async () => {
  const users = await backfill(User);
  const items = await backfill(Item);

  if (users + items > 0) {
    console.log(`Filled uid on ${users} users and ${items} items`);
  }
};
