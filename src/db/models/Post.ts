import mongoose, { Document, Schema } from 'mongoose';

export interface IButton {
  label: string;
  callbackData: string;
  popupText: string;
  popupUrl?: string;
}

export type PostType = 'text' | 'photo' | 'button_post' | 'event';

export interface IPost extends Document {
  telegramMessageId?: number;
  channelId: string;
  type: PostType;
  text?: string;
  photoFileId?: string;
  buttons: IButton[];
  createdAt: Date;
  updatedAt: Date;
}

const ButtonSchema = new Schema<IButton>({
  label: { type: String, required: true },
  callbackData: { type: String, required: true, unique: true },
  popupText: { type: String, required: true },
  popupUrl: { type: String },
});

const PostSchema = new Schema<IPost>(
  {
    telegramMessageId: { type: Number },
    channelId: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'photo', 'button_post', 'event'],
      required: true,
    },
    text: { type: String },
    photoFileId: { type: String },
    buttons: { type: [ButtonSchema], default: [] },
  },
  { timestamps: true }
);

// Index for fast callback lookup
PostSchema.index({ 'buttons.callbackData': 1 });

export const Post = mongoose.model<IPost>('Post', PostSchema);
