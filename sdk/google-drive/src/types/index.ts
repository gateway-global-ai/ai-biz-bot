/**
 * Google Drive SDK Configuration Types
 */

export interface GoogleDriveConfig {
  /** OAuth 2.0 client ID */
  clientId: string;
  /** OAuth 2.0 client secret */
  clientSecret: string;
  /** OAuth 2.0 redirect URI */
  redirectUri: string;
  /** OAuth scopes (defaults to drive access) */
  scopes?: string[];
}

export interface OAuthCredentials {
  /** Access token for API requests */
  access_token: string;
  /** Refresh token for obtaining new access tokens */
  refresh_token?: string;
  /** Token expiry timestamp */
  expiry_date?: number;
  /** Token type (usually "Bearer") */
  token_type?: string;
  /** Granted scopes */
  scope?: string;
}

export interface DriveFile {
  /** File ID */
  id: string;
  /** File name */
  name: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size?: string;
  /** Creation time */
  createdTime?: string;
  /** Last modification time */
  modifiedTime?: string;
  /** Parent folder IDs */
  parents?: string[];
  /** Web view link */
  webViewLink?: string;
  /** Web content link */
  webContentLink?: string;
  /** File owners */
  owners?: Array<{ displayName: string; emailAddress: string }>;
}

export interface DriveFolder extends DriveFile {
  mimeType: 'application/vnd.google-apps.folder';
}

export interface ListFilesOptions {
  /** Maximum number of files to return */
  pageSize?: number;
  /** Search query */
  query?: string;
  /** Sort order */
  orderBy?: string;
  /** Fields to include in response */
  fields?: string;
  /** Page token for pagination */
  pageToken?: string;
}

export interface ListFilesResult {
  /** Array of files */
  files: DriveFile[];
  /** Next page token */
  nextPageToken?: string;
}

export interface UploadFileOptions {
  /** File name */
  name: string;
  /** File content (string, Buffer, or Stream) */
  content: string | Buffer | NodeJS.ReadableStream;
  /** MIME type */
  mimeType: string;
  /** Parent folder ID */
  parentId?: string;
  /** File description */
  description?: string;
}

export interface FilePermission {
  /** Permission type: 'user', 'group', 'domain', 'anyone' */
  type: 'user' | 'group' | 'domain' | 'anyone';
  /** Role: 'owner', 'organizer', 'fileOrganizer', 'writer', 'commenter', 'reader' */
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  /** Email address (for user/group type) */
  emailAddress?: string;
  /** Domain (for domain type) */
  domain?: string;
  /** Allow file discovery */
  allowFileDiscovery?: boolean;
}

export interface ToolResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Result data */
  data?: any;
  /** Error message if unsuccessful */
  error?: string;
}
