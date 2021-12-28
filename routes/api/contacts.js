const express = require("express");
const { NotFound, BadRequest } = require("http-errors");
const Joi = require("joi");

const { Contact } = require("../../models");

const router = express.Router();

const joiSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().required(),
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
});

// router.get("/", async (req, res, next) => {
//   try {
//     const contacts = await contactsOperation.listContacts();
//     res.json(contacts);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get("/:contactId", async (req, res, next) => {
//   try {
//     const { contactId } = req.params;
//     const contact = await contactsOperation.getContactById(contactId);

//     if (!contact) throw new NotFound("Not found");

//     res.json(contact);
//   } catch (error) {
//     next(error);
//   }
// });

router.post("/", async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) throw new BadRequest("missing required name field");

    const newContact = await Contact.create(req.body);

    res.status(201).json(newContact);
  } catch (error) {
    next(error);
  }
});

// router.delete("/:contactId", async (req, res, next) => {
//   try {
//     const { contactId } = req.params;
//     const deleteContact = await contactsOperation.removeContact(contactId);

//     if (!deleteContact) throw new NotFound("Not found");

//     res.json({ message: "contact deleted" });
//   } catch (error) {
//     next(error);
//   }
// });

// router.put("/:contactId", async (req, res, next) => {
//   try {
//     const { error } = joiSchema.validate(req.body);
//     if (error) throw new BadRequest("missing fields");

//     const { contactId } = req.params;
//     const updateContact = await contactsOperation.updateContact(
//       contactId,
//       req.body
//     );

//     if (!updateContact) throw new NotFound("Not found");

//     res.json(updateContact);
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = router;
