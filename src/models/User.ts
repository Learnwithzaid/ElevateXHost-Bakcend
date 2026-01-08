import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { decryptToken, encryptToken } from '../services/encryptionService';

export interface IUser extends Document {
  email: string;
  username: string;
  password?: string;
  githubId?: string;
  githubAccessToken?: string;
  githubUsername?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getGitHubToken(): Promise<string>;
  setGitHubToken(token: string): Promise<void>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    password: {
      type: String,
      select: false,
    },
    githubId: {
      type: String,
      sparse: true,
    },
    githubAccessToken: {
      type: String,
      select: false,
    },
    githubUsername: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  const user = this as IUser;
  
  if (!user.isModified('password') || !user.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  const user = this as IUser;
  if (!user.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, user.password);
};

// Get decrypted GitHub access token
userSchema.methods.getGitHubToken = async function (): Promise<string> {
  const user = this as IUser;
  if (!user.githubAccessToken) {
    return '';
  }
  try {
    return decryptToken(user.githubAccessToken);
  } catch (error) {
    console.error('Error decrypting GitHub token:', error);
    return '';
  }
};

// Set encrypted GitHub access token
userSchema.methods.setGitHubToken = async function (
  token: string
): Promise<void> {
  const user = this as IUser;
  if (!token) {
    user.githubAccessToken = undefined;
    return;
  }
  try {
    user.githubAccessToken = encryptToken(token);
  } catch (error) {
    console.error('Error encrypting GitHub token:', error);
    throw new Error('Failed to encrypt GitHub access token');
  }
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
