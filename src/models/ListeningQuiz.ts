import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface IListeningQuiz extends Document {
  title: string;
  description: string;
  broadcastId?: string | null;
  quiz: { questions: IQuizQuestion[] } | null;
  quizGeneratedAt?: Date | null;
  targetCampuses: string[];
  targetGroups: string[];
  excludeCampuses: string[];
  excludeGroups: string[];
  createdBy?: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    correctAnswerIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

const ListeningQuizSchema = new Schema<IListeningQuiz>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    broadcastId: { type: String, default: null },
    quiz: {
      type: new Schema<{ questions: IQuizQuestion[] }>(
        { questions: { type: [QuizQuestionSchema], default: [] } },
        { _id: false }
      ),
      default: null,
    },
    quizGeneratedAt: { type: Date, default: null },
    targetCampuses: { type: [String], default: ['all'] },
    targetGroups: { type: [String], default: ['all'] },
    excludeCampuses: { type: [String], default: [] },
    excludeGroups: { type: [String], default: [] },
    createdBy: { type: String, default: '' },
    createdByName: { type: String, default: '' },
  },
  { timestamps: true }
);

ListeningQuizSchema.index({ createdAt: -1 });
ListeningQuizSchema.index({ targetCampuses: 1 });

export interface IListeningQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  userId: string;
  answers: number[];
  correctCount: number;
  scorePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const ListeningQuizAttemptSchema = new Schema<IListeningQuizAttempt>(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'ListeningQuiz', required: true },
    userId: { type: String, required: true },
    answers: { type: [Number], default: [] },
    correctCount: { type: Number, default: 0 },
    scorePercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ListeningQuizAttemptSchema.index({ userId: 1, quizId: 1 }, { unique: true });

export const ListeningQuiz: Model<IListeningQuiz> =
  mongoose.models.ListeningQuiz ||
  mongoose.model<IListeningQuiz>('ListeningQuiz', ListeningQuizSchema);

export const ListeningQuizAttempt: Model<IListeningQuizAttempt> =
  mongoose.models.ListeningQuizAttempt ||
  mongoose.model<IListeningQuizAttempt>('ListeningQuizAttempt', ListeningQuizAttemptSchema);

export default ListeningQuiz;
