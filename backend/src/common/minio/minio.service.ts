import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.configService.get('MINIO_BUCKET', 'sihatilab-documents');
    this.client = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'minio'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: this.configService.get('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'minioadmin'),
    });

    await this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        await this.client.setBucketPolicy(this.bucket, JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          }],
        }));
        this.logger.log(`Bucket "${this.bucket}" created`);
      }
    } catch (error) {
      this.logger.error(`MinIO bucket init error: ${error.message}`);
    }
  }

  async uploadFile(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return this.getPublicUrl(objectName);
  }

  getPublicUrl(objectName: string): string {
    const endpoint = this.configService.get('MINIO_ENDPOINT', 'minio');
    const port = this.configService.get('MINIO_PORT', '9000');
    const ssl = this.configService.get('MINIO_USE_SSL', 'false') === 'true';
    const protocol = ssl ? 'https' : 'http';
    // Expose via localhost for external access
    const host = endpoint === 'minio' ? 'localhost' : endpoint;
    return `${protocol}://${host}:${port}/${this.bucket}/${objectName}`;
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, objectName);
    } catch (error) {
      this.logger.warn(`Could not delete object ${objectName}: ${error.message}`);
    }
  }
}
