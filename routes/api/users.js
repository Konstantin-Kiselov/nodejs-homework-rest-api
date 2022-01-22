const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { BadRequest, Conflict, Unauthorized, NotFound } = require("http-errors");
const gravatar = require("gravatar");
const Jimp = require("jimp");
const { v4 } = require("uuid");
const path = require("path");
const fs = require("fs/promises");

const { authenticate, upload } = require("../../middlewares");
const { joiSchema, joiSubSchema } = require("../../models/user");
const { User } = require("../../models");
const { sendEmail } = require("../../helpers");

const router = express.Router();

const { SECRET_KEY, SITE_NAME } = process.env;

const avatarsDir = path.join(__dirname, "../../", "public", "avatars");

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

    const avatarURL = gravatar.url(email);

    const salt = await bcrypt.genSalt(10);
    const hashPass = await bcrypt.hash(password, salt);
    const verificationToken = v4();

    const newUser = await User.create({
      ...req.body,
      avatarURL,
      password: hashPass,
      verificationToken,
    });

    const data = {
      to: email,
      subject: "Подтверждение регистрации",
      html: `<a target="_blank" href="${SITE_NAME}/api/users/verify/${verificationToken}">Подтвердить email</a>`,
    };

    await sendEmail(data);

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

router.get("/verify/:verificationToken", async (req, res, next) => {
  try {
    const { verificationToken } = req.params;
    const user = await User.findOne({ verificationToken });
    if (!user) {
      throw new NotFound("User not found");
    }
    await User.findByIdAndUpdate(user._id, {
      verificationToken: null,
      verify: true,
    });

    res.json({ message: "Verification successful" });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new BadRequest("missing required field email");

    const user = await User.findOne({ email });
    if (!user) throw new NotFound("User not found");

    const { verificationToken, verify } = user;
    if (verify) throw new BadRequest("Verification has already been passed");

    const data = {
      to: email,
      subject: "Подтверждение регистрации",
      html: `<a target="_blank" href="${SITE_NAME}/api/users/verify/${verificationToken}">Подтвердить email</a>`,
    };

    await sendEmail(data);

    res.json({ message: "Verification email sent" });
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

    const { _id, subscription, verify } = user;

    if (!verify) {
      throw new Unauthorized("Email not verify");
    }

    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw new Unauthorized("Email or password is wrong");
    }

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

router.patch(
  "/avatars",
  authenticate,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const { _id } = req.user;
      const { path: tmpUpload, filename } = req.file;

      const [extension] = filename.split(".").reverse();
      const newFileName = `${_id}.${extension}`;

      const fileUpload = path.join(avatarsDir, newFileName);
      const avatarURL = path.join("public", "avatars", newFileName);

      await Jimp.read(tmpUpload)
        .then((avatar) => {
          return avatar.resize(250, 250).write(tmpUpload);
        })
        .catch((err) => {
          throw err;
        });

      await fs.rename(tmpUpload, fileUpload);
      await User.findByIdAndUpdate(_id, { avatarURL }, { new: true });

      res.json({ avatarURL });
    } catch (error) {
      fs.unlink(req.file.path);
      next(error);
    }
  }
);

module.exports = router;
