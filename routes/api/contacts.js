const express = require("express");
const router = express.Router();

const contactsOperation = require("../../model");

router.get("/", async (req, res, next) => {
  const contacts = await contactsOperation.listContacts();
  res.json(contacts);
});

router.get("/:contactId", async (req, res, next) => {
  res.json({ message: "template message" });
});

router.post("/", async (req, res, next) => {
  res.json({ message: "template message" });
});

router.delete("/:contactId", async (req, res, next) => {
  res.json({ message: "template message" });
});

router.patch("/:contactId", async (req, res, next) => {
  res.json({ message: "template message" });
});

module.exports = router;
