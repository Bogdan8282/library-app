const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  filename: String,
  description: String,
  author: String,
  genres: [{ type: mongoose.Schema.Types.ObjectId, ref: "Genre" }],
  filepath: String,
  coverImagePath: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("File", fileSchema);
