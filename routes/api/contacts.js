const express = require("express");
const { NotFound, BadRequest } = require("http-errors");

const { authenticate } = require("../../middlewares");
const { joiSchema } = require("../../models/contact");
const { Contact } = require("../../models");

const router = express.Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, favorite = false } = req.query;
    const { _id } = req.user;
    const skip = (page - 1) * limit;

    if (favorite) {
      const contacts = await Contact.find(
        { owner: _id, favorite },
        "-createdAt -updatedAt",
        { skip, limit: +limit }
      );
      return res.json(contacts);
    }

    const contacts = await Contact.find(
      { owner: _id },
      "-createdAt -updatedAt",
      { skip, limit: +limit }
    );
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

router.get("/:contactId", authenticate, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const contact = await Contact.findById(contactId);

    if (!contact) throw new NotFound("Not found");

    res.json(contact);
  } catch (error) {
    if (error.message.includes("Cast to ObjectId failed")) error.status = 404;

    next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) throw new BadRequest("missing required field");

    const { _id } = req.user;
    const newContact = await Contact.create({ ...req.body, owner: _id });

    res.status(201).json(newContact);
  } catch (error) {
    if (error.message.includes("validation failed")) error.status = 400;

    next(error);
  }
});

router.delete("/:contactId", authenticate, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const deleteContact = await Contact.findByIdAndRemove(contactId);

    if (!deleteContact) throw new NotFound("Not found");

    res.json({ message: "contact deleted" });
  } catch (error) {
    next(error);
  }
});

router.put("/:contactId", authenticate, async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) throw new BadRequest("missing fields");

    const { contactId } = req.params;
    const updateContact = await Contact.findByIdAndUpdate(contactId, req.body, {
      new: true,
    });

    if (!updateContact) throw new NotFound("Not found");

    res.json(updateContact);
  } catch (error) {
    if (error.message.includes("validation failed")) error.status = 400;

    next(error);
  }
});

router.patch("/:contactId/favorite", authenticate, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const { favorite } = req.body;

    if (favorite === undefined) {
      throw new BadRequest("missing field favorite");
    }

    const updateStatusContact = await Contact.findByIdAndUpdate(
      contactId,
      { favorite },
      {
        new: true,
      }
    );

    if (!updateStatusContact) throw new NotFound("Not found");

    res.json(updateStatusContact);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
