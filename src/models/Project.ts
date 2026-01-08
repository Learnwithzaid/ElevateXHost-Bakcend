import mongoose, { Document, Model, Schema } from 'mongoose';
import { verifyGitHubSignature } from '../utils/webhookVerifier';
import { logRedeploy } from '../utils/logger';

export interface IProject extends Document {
  name: string;
  githubRepo: string; // full_name: 'owner/repo'
  webhookSecret: string;
  defaultBranch: string;
  status: string;
  lastDeploymentTime?: Date;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  verifyWebhookSignature(signature: string, payload: string): boolean;
  onWebhookReceived(payload: any): Promise<void>;
  triggerRedeploy(): Promise<void>;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    githubRepo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    webhookSecret: {
      type: String,
      required: true,
    },
    defaultBranch: {
      type: String,
      default: 'main',
      required: true,
    },
    status: {
      type: String,
      default: 'idle',
      enum: ['idle', 'deploying', 'success', 'failure'],
    },
    lastDeploymentTime: {
      type: Date,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify webhook signature
projectSchema.methods.verifyWebhookSignature = function (
  signature: string,
  payload: string
): boolean {
  return verifyGitHubSignature(payload, signature, this.webhookSecret);
};

// Method to trigger redeployment
projectSchema.methods.triggerRedeploy = async function (): Promise<void> {
  logRedeploy(this._id.toString(), this.defaultBranch, 'triggered');
  // Logic to initiate redeployment would go here
};

// Method called when a webhook is received
projectSchema.methods.onWebhookReceived = async function (
  payload: any
): Promise<void> {
  const ref = payload.ref;
  if (!ref) return;

  const branch = ref.replace('refs/heads/', '');
  
  if (branch === this.defaultBranch) {
    await this.triggerRedeploy();
    this.status = 'deploying';
    this.lastDeploymentTime = new Date();
    await this.save();
  }
};

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);

export default Project;
