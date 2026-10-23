import { Router } from "express";
import {
  createItem,
  deleteItem,
  getItem,
  getItemByUid,
  listItems,
  updateItem,
} from "../controllers/item.controller.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createItemSchema,
  itemIdSchema,
  itemUidParamSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from "../validators/item.validators.js";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(validate(listItemsQuerySchema, "query"), listItems)
  .post(validate(createItemSchema), createItem);

router.get(
  "/uid/:uid",
  validate(itemUidParamSchema, "params"),
  getItemByUid
);

router
  .route("/:id")
  .get(validate(itemIdSchema, "params"), getItem)
  .patch(
    validate(itemIdSchema, "params"),
    validate(updateItemSchema),
    updateItem
  )
  .delete(validate(itemIdSchema, "params"), deleteItem);

export default router;
