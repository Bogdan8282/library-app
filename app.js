const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const User = require("./models/User");
const File = require("./models/File");
const Genre = require("./models/Genre");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

const cpUpload = upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]);

const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res
      .status(401)
      .render("login", { error: "Unauthorized. Please log in." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res
      .status(401)
      .render("login", { error: "Invalid token. Please log in again." });
  }
};

app.get("/api/profile", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.userId).select("-password");
  res.json(user);
});

app.get("/", async (req, res) => {
  try {
    const files = await File.find().sort({ uploadedAt: -1 });
    res.render("index", { files });
  } catch (err) {
    console.error("Main page error:", err);
    res.render("index", { error: "Something went wrong" });
  }
});

app.get("/register", async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    if (usersCount > 0) {
      return res.redirect("/login");
    }
    res.render("register", { error: null });
  } catch (err) {
    console.error("Register page error:", err);
    res.redirect("/login");
  }
});

app.post("/register", async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    if (usersCount > 0) {
      return res.redirect("/login"); 
    }

    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render("register", { error: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true });
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Register error:", err);
    res.render("register", { error: "Something went wrong" });
  }
});

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render("login", { error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true });
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { error: "Something went wrong" });
  }
});

app.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const files = await File.find().sort({ uploadedAt: -1 });
    const genres = await Genre.find().sort({ name: 1 });
    const user = await User.findById(req.user.userId).select("-password");
    res.render("dashboard", { user, files, genres });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.post("/upload", cpUpload, async (req, res) => {
  const { filename, description, author } = req.body;
  let { genres } = req.body;
  const pdfFile = req.files["pdf"] ? req.files["pdf"][0] : null;
  const coverFile = req.files["cover"] ? req.files["cover"][0] : null;

  if (!pdfFile) return res.status(400).send("PDF-файл обов'язковий.");

  if (!Array.isArray(genres)) {
    genres = [genres];
  }

  const file = new File({
    filename,
    description,
    author,
    genres,
    filepath: `/uploads/${pdfFile.filename}`,
    coverImagePath: coverFile ? `/uploads/${coverFile.filename}` : undefined,
  });

  await file.save();
  res.redirect("/dashboard");
});

app.post("/delete/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (file) {
      fs.unlinkSync(path.join(__dirname, file.filepath));

      if (file.coverImagePath) {
        const coverPath = path.join(__dirname, file.coverImagePath);
        if (fs.existsSync(coverPath)) {
          fs.unlinkSync(coverPath);
        }
      }

      await file.deleteOne();
    }
    res.redirect("/dashboard");
  } catch (err) {
    res.status(500).send("Помилка при видаленні файлу.");
  }
});

app.get("/edit/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate("genres");
    const allGenres = await Genre.find().sort({ name: 1 });
    if (!file) return res.status(404).send("Файл не знайдено");
    res.render("edit", { file, allGenres }); 
  } catch (err) {
    res.status(500).send("Помилка при отриманні файлу.");
  }
});

app.post("/edit/:id", cpUpload, async (req, res) => {
  let { filename, description, author, genres } = req.body;
  if (!Array.isArray(genres)) {
    genres = [genres];
  }
  const coverFile = req.files["cover"] ? req.files["cover"][0] : null;

  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).send("Файл не знайдено");

    if (coverFile) {
      if (file.coverImagePath) {
        const oldCoverPath = path.join(__dirname, file.coverImagePath);
        if (fs.existsSync(oldCoverPath)) {
          fs.unlinkSync(oldCoverPath);
        }
      }
      file.coverImagePath = `/uploads/${coverFile.filename}`;
    }

    file.filename = filename;
    file.description = description;
    file.author = author;
    file.genres = genres;

    await file.save();
    res.redirect("/dashboard");
  } catch (err) {
    res.status(500).send("Помилка при оновленні файлу.");
  }
});

app.get("/api/uploads", async (req, res) => {
  try {
    const files = await File.find()
      .populate("genres", "name")
      .sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    console.error("Помилка при отриманні файлів з бази:", err);
    res.status(500).json({ error: "Не вдалося отримати файли з бази" });
  }
});

app.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send("Файл не знайдено");
    }

    res.sendFile(filePath);
  });
});

app.get("/viewer", async (req, res) => {
  const fileParam = req.query.file;
  if (!fileParam) return res.status(400).send("Файл не вказано");

  try {
    const file = await File.findOne({ filepath: `/uploads/${fileParam}` });
    if (!file) return res.status(404).send("Файл не знайдено");

    res.render("viewer", { file });
  } catch (err) {
    console.error("Помилка при завантаженні книги:", err);
    res.status(500).send("Помилка при завантаженні книги.");
  }
});

app.get("/viewer/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate("genres");
    if (!file) return res.status(404).send("Файл не знайдено");

    res.render("viewer", { file });
  } catch (err) {
    console.error("Viewer error:", err);
    res.status(500).send("Помилка при завантаженні книги.");
  }
});

app.post("/delete-account", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    await User.findByIdAndDelete(userId);

    res.clearCookie("token");

    res.redirect("/register");
  } catch (err) {
    console.error("Помилка при видаленні акаунту:", err);
    res.status(500).send("Помилка при видаленні акаунту.");
  }
});

app.listen(PORT, () =>
  console.log(`Server running at ${PORT}`)
);
