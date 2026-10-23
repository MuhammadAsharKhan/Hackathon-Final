import Item from "../models/Item.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listItems = asyncHandler(async (req, res) => {
  const { page, limit, search, status } = req.query;

  const filter = { owner: req.user.id };
  if (status) filter.status = status;
  if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };

  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Item.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

export const createItem = asyncHandler(async (req, res) => {
  const item = await Item.create({ ...req.body, owner: req.user.id });
  res.status(201).json({ success: true, data: { item }, message: "Item created" });
});

export const getItem = asyncHandler(async (req, res) => {
  const item = await Item.findOne({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!item) throw new ApiError(404, "Item not found");

  res.json({ success: true, data: { item } });
});

export const getItemByUid = asyncHandler(async (req, res) => {
  const item = await Item.findOne({
    uid: req.params.uid,
    owner: req.user.id,
  });

  if (!item) throw new ApiError(404, "Item not found");

  res.json({ success: true, data: { item } });
});

export const updateItem = asyncHandler(async (req, res) => {
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!item) throw new ApiError(404, "Item not found");

  res.json({ success: true, data: { item }, message: "Item updated" });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findOneAndDelete({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!item) throw new ApiError(404, "Item not found");

  res.json({ success: true, data: { id: item.id }, message: "Item deleted" });
});
