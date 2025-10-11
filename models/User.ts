import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  employerType?: 'Field' | 'HQ';
  department?: string;
  position?: string;
  archived?: boolean;
  archivedAt?: Date;
  themePreference?: 'light' | 'dark' | 'system';
  createdAt?: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  employerType: { type: String, enum: ['Field', 'HQ'] },
  department: { type: String },
  position: { type: String },
  archived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  themePreference: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  createdAt: { type: Date, default: Date.now }
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
