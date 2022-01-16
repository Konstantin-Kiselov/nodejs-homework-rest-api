const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { BadRequest, Conflict, Unauthorized } = require("http-errors");
const gravatar = require("gravatar");

const path = require("path");
const fs = require("fs/promises");

const { authenticate, upload } = require("../../middlewares");
const { joiSchema, joiSubSchema } = require("../../models/user");
const { User } = require("../../models");

const router = express.Router();

const { SECRET_KEY } = process.env;

router.post("/", upload.single("avatar"), async (req, res, next) => {
  try {
    console.log(req.file.path);
    const { path: pathFile, filename } = req.file;
    const fileUpload = path.join(
      __dirname,
      "../../",
      "public",
      "avatars",
      filename
    );
    console.log(fileUpload);
    await fs.rename(pathFile, fileUpload);
  } catch (error) {
    fs.unlink(req.file.path);
    next(error);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw new Conflict("Email in use");
    }

    const avatarUrl = gravatar.url(email);
    console.log(avatarUrl);

    const salt = await bcrypt.genSalt(10);
    const hashPass = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      ...req.body,
      password: hashPass,
      avatarUrl,
    });

    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new Unauthorized("Email or password is wrong");
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw new Unauthorized("Email or password is wrong");
    }

    const { _id, subscription } = user;

    const payload = {
      id: _id,
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });

    await User.findByIdAndUpdate(_id, { token });

    res.json({
      token,
      user: {
        email,
        subscription,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/current", authenticate, async (req, res, next) => {
  try {
    const { email, subscription } = req.user;

    res.json({
      email,
      subscription,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/logout", authenticate, async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: null });

  res.status(204).send();
});

router.patch("/", authenticate, async (req, res, next) => {
  try {
    const { error } = joiSubSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }
    const { _id } = req.user;
    const { subscription } = req.body;
    const updateContact = await User.findByIdAndUpdate(
      _id,
      { subscription },
      { new: true }
    );
    res.json(updateContact);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
