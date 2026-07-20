const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: [true, 'Interview ID is required'],
      unique: true, // One evaluation per interview
    },
    score: {
      type: Number,
      required: [true, 'Score is required'],
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    strengths: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return Array.isArray(v);
        },
        message: 'Strengths must be an array of strings',
      },
    },
    weaknesses: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return Array.isArray(v);
        },
        message: 'Weaknesses must be an array of strings',
      },
    },
    suggestions: {
      type: [String],
      default: [],
      validate: {
        validator: function (v) {
          return Array.isArray(v);
        },
        message: 'Suggestions must be an array of strings',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Evaluation', evaluationSchema);
