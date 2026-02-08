/**
 * Google Drive SDK
 * 
 * A comprehensive SDK for integrating Google Drive API functionality
 * with a unified interface for file management, sharing, and collaboration.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';
import type {
  GoogleDriveConfig,
  OAuthCredentials,
  DriveFile,
  DriveFolder,
  ListFilesOptions,
  ListFilesResult,
  UploadFileOptions,
  FilePermission,
  ToolResult
} from './types';

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];

export class GoogleDriveSDK {
  private config: GoogleDriveConfig;
  private oauth2Client: OAuth2Client;
  private drive: any;

  constructor(config: GoogleDriveConfig) {
    this.config = {
      ...config,
      scopes: config.scopes || DEFAULT_SCOPES
    };

    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<OAuthCredentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens as OAuthCredentials;
  }

  /**
   * Authenticate with OAuth credentials
   */
  async authenticate(credentials: OAuthCredentials): Promise<void> {
    this.oauth2Client.setCredentials(credentials);
  }

  /**
   * Set credentials directly
   */
  setCredentials(credentials: OAuthCredentials): void {
    this.oauth2Client.setCredentials(credentials);
  }

  /**
   * Get current credentials
   */
  getCredentials(): OAuthCredentials {
    return this.oauth2Client.credentials as OAuthCredentials;
  }

  /**
   * List files from Google Drive
   */
  async listFiles(options: ListFilesOptions = {}): Promise<ListFilesResult> {
    try {
      const response = await this.drive.files.list({
        pageSize: options.pageSize || 10,
        fields: options.fields || 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, size, parents, webViewLink, webContentLink, owners)',
        q: options.query,
        orderBy: options.orderBy,
        pageToken: options.pageToken
      });

      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken
      };
    } catch (error: any) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Create a folder
   */
  async createFolder(name: string, parentId?: string): Promise<DriveFolder> {
    try {
      const fileMetadata: any = {
        name,
        mimeType: 'application/vnd.google-apps.folder'
      };

      if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType, createdTime, parents, webViewLink'
      });

      return response.data as DriveFolder;
    } catch (error: any) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  /**
   * Upload a file
   */
  async uploadFile(options: UploadFileOptions): Promise<DriveFile> {
    try {
      const fileMetadata: any = {
        name: options.name,
        description: options.description
      };

      if (options.parentId) {
        fileMetadata.parents = [options.parentId];
      }

      // Convert content to readable stream
      let media;
      if (typeof options.content === 'string') {
        media = {
          mimeType: options.mimeType,
          body: Readable.from([options.content])
        };
      } else if (Buffer.isBuffer(options.content)) {
        media = {
          mimeType: options.mimeType,
          body: Readable.from([options.content])
        };
      } else {
        media = {
          mimeType: options.mimeType,
          body: options.content
        };
      }

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, mimeType, size, createdTime, webViewLink, webContentLink'
      });

      return response.data as DriveFile;
    } catch (error: any) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download file content
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media'
      }, {
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string, fields?: string): Promise<DriveFile> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: fields || 'id, name, mimeType, createdTime, modifiedTime, size, parents, webViewLink, webContentLink, owners'
      });

      return response.data as DriveFile;
    } catch (error: any) {
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  /**
   * Delete a file or folder
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
    } catch (error: any) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Share a file with specific permissions
   */
  async shareFile(fileId: string, permission: FilePermission): Promise<any> {
    try {
      const response = await this.drive.permissions.create({
        fileId,
        requestBody: permission,
        sendNotificationEmail: !!permission.emailAddress
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to share file: ${error.message}`);
    }
  }

  /**
   * Remove file permissions
   */
  async removePermission(fileId: string, permissionId: string): Promise<void> {
    try {
      await this.drive.permissions.delete({
        fileId,
        permissionId
      });
    } catch (error: any) {
      throw new Error(`Failed to remove permission: ${error.message}`);
    }
  }

  /**
   * List file permissions
   */
  async listPermissions(fileId: string): Promise<any[]> {
    try {
      const response = await this.drive.permissions.list({
        fileId,
        fields: 'permissions(id, type, role, emailAddress, domain, displayName)'
      });

      return response.data.permissions || [];
    } catch (error: any) {
      throw new Error(`Failed to list permissions: ${error.message}`);
    }
  }

  /**
   * Search files with query
   */
  async searchFiles(query: string, pageSize: number = 10): Promise<DriveFile[]> {
    try {
      const result = await this.listFiles({ query, pageSize });
      return result.files;
    } catch (error: any) {
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Copy a file
   */
  async copyFile(fileId: string, name: string, parentId?: string): Promise<DriveFile> {
    try {
      const requestBody: any = { name };
      if (parentId) {
        requestBody.parents = [parentId];
      }

      const response = await this.drive.files.copy({
        fileId,
        requestBody,
        fields: 'id, name, mimeType, createdTime, webViewLink'
      });

      return response.data as DriveFile;
    } catch (error: any) {
      throw new Error(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Move a file to a different folder
   */
  async moveFile(fileId: string, newParentId: string): Promise<DriveFile> {
    try {
      // Get current parents
      const file = await this.getFile(fileId, 'parents');
      const previousParents = file.parents?.join(',') || '';

      // Move file
      const response = await this.drive.files.update({
        fileId,
        addParents: newParentId,
        removeParents: previousParents,
        fields: 'id, name, parents'
      });

      return response.data as DriveFile;
    } catch (error: any) {
      throw new Error(`Failed to move file: ${error.message}`);
    }
  }

  /**
   * Rename a file
   */
  async renameFile(fileId: string, newName: string): Promise<DriveFile> {
    try {
      const response = await this.drive.files.update({
        fileId,
        requestBody: { name: newName },
        fields: 'id, name, mimeType'
      });

      return response.data as DriveFile;
    } catch (error: any) {
      throw new Error(`Failed to rename file: ${error.message}`);
    }
  }
}
