const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: [true, 'Interview ID is required'],
      unique: true, // One feedback per interview
    },
    resumeAnalysis: {
      type: String,
      default: '',
    },
    atsAnalysis: {
      type: String,
      default: '',
    },
    finalFeedback: {
      type: String,
      default: '',
    },
    roadmap: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
