const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: [true, 'Resume ID is required'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    interviewType: {
      type: String,
      enum: {
        values: ['all', 'hr', 'behavioral', 'project-based', 'technical'],
        message: 'Interview type must be one of all/hr/behavioral/project-based/technical',
      },
      default: 'all',
    },
    numQuestions: {
      type: Number,
      default: 10,
      enum: {
        values: [10, 15, 20],
        message: 'Number of questions must be 10, 15, or 20',
      },
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: [1, 'Must have at least 1 question'],
      max: [50, 'Cannot exceed 50 questions'],
    },
    status: {
      type: String,
      enum: {
        values: ['in-progress', 'completed'],
        message: 'Status must be either "in-progress" or "completed"',
      },
      default: 'in-progress',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Interview', interviewSchema);
