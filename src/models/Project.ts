import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import CloudflareService from '../services/cloudflareService';
import NetlifyService from '../services/netlifyService';
import { DeploymentStatus } from '../types';

export type DeploymentProvider = 'cloudflare' | 'netlify';
export type ProjectStatus = 'deploying' | 'deployed' | 'failed';

export interface IProject extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  githubRepo: string;
  deploymentProvider: DeploymentProvider;
  deploymentId: string;
  deploymentUrl: string;
  status: ProjectStatus;
  webhookSecret: string;
  lastDeploymentTime?: Date;
  createdAt: Date;
  updatedAt: Date;

  getDeploymentStatus(): Promise<DeploymentStatus>;
  triggerRedeploy(): Promise<void>;
  getDeploymentService(): CloudflareService | NetlifyService;
}

let cloudflareService: CloudflareService | null = null;
let netlifyService: NetlifyService | null = null;

function getCloudflareService(): CloudflareService {
  if (!cloudflareService) {
    cloudflareService = new CloudflareService();
  }
  return cloudflareService;
}

function getNetlifyService(): NetlifyService {
  if (!netlifyService) {
    netlifyService = new NetlifyService();
  }
  return netlifyService;
}

function normalizeProjectStatus(value: string): ProjectStatus {
  const v = value.toLowerCase();
  if (v === 'deployed') return 'deployed';
  if (v === 'failed') return 'failed';
  return 'deploying';
}

const projectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    githubRepo: {
      type: String,
      required: true,
      trim: true,
    },
    deploymentProvider: {
      type: String,
      required: true,
      enum: ['cloudflare', 'netlify'],
    },
    deploymentId: {
      type: String,
      required: true,
    },
    deploymentUrl: {
      type: String,
      required: true,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: ['deploying', 'deployed', 'failed'],
      default: 'deploying',
    },
    webhookSecret: {
      type: String,
      required: true,
      select: false,
    },
    lastDeploymentTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ userId: 1, name: 1 }, { unique: true });

projectSchema.methods.getDeploymentService = function (
  this: IProject
): CloudflareService | NetlifyService {
  if (this.deploymentProvider === 'cloudflare') {
    return getCloudflareService();
  }
  return getNetlifyService();
};

projectSchema.methods.getDeploymentStatus = async function (
  this: IProject
): Promise<DeploymentStatus> {
  const service = this.getDeploymentService() as any;
  const status = (await service.getDeploymentStatus(
    this.deploymentId
  )) as DeploymentStatus;

  this.status = normalizeProjectStatus(
    typeof status.status === 'string' ? status.status : 'deploying'
  );
  this.deploymentUrl = status.deploymentUrl || status.url || this.deploymentUrl;
  this.lastDeploymentTime = status.lastDeployed;

  await this.save();

  return status;
};

projectSchema.methods.triggerRedeploy = async function (this: IProject): Promise<void> {
  const service = this.getDeploymentService() as any;
  await service.triggerRedeploy(this.deploymentId);

  this.status = 'deploying';
  this.lastDeploymentTime = new Date();
  await this.save();
};

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>('Project', projectSchema);

export default Project;
