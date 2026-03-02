import mongoose, { Document, Schema } from 'mongoose';

export interface IPollOption {
  text: string;
  callbackData: string;
  votes: number;
  voterIds: number[];
}

export interface IPoll extends Document {
  telegramMessageId?: number;
  channelId: string;
  question: string;
  options: IPollOption[];
  isAnonymous: boolean;
  isClosed: boolean;
  closesAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PollOptionSchema = new Schema<IPollOption>({
  text: { type: String, required: true },
  callbackData: { type: String, required: true },
  votes: { type: Number, default: 0 },
  voterIds: { type: [Number], default: [] },
});

const PollSchema = new Schema<IPoll>(
  {
    telegramMessageId: { type: Number },
    channelId: { type: String, required: true },
    question: { type: String, required: true },
    options: { type: [PollOptionSchema], required: true },
    isAnonymous: { type: Boolean, default: true },
    isClosed: { type: Boolean, default: false },
    closesAt: { type: Date },
  },
  { timestamps: true }
);

PollSchema.index({ 'options.callbackData': 1 });

export const Poll = mongoose.model<IPoll>('Poll', PollSchema);
