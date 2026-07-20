const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: [true, 'Interview ID is required'],
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
    },
    questionNumber: {
      type: Number,
      required: [true, 'Question number is required'],
      min: [1, 'Question number must be at least 1'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
answerSchema.index({ interviewId: 1, questionNumber: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);
