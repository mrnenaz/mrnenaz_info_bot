import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  telegramMessageId?: number;
  channelId: string;
  title: string;
  description: string;
  location?: string;
  eventDate: Date;
  photoFileId?: string;
  callbackData: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    telegramMessageId: { type: Number },
    channelId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String },
    eventDate: { type: Date, required: true },
    photoFileId: { type: String },
    callbackData: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

EventSchema.index({ callbackData: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
