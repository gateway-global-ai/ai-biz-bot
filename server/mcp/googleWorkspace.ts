import { google, calendar_v3, tasks_v1, docs_v1, sheets_v4, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export interface GoogleWorkspaceCredentials {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

export interface CalendarEventParams {
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
}

export interface TaskParams {
  title: string;
  notes?: string;
  dueDate?: string;
}

export interface DocumentParams {
  title: string;
  content?: string;
}

export interface SpreadsheetParams {
  title: string;
  headers?: string[];
  data?: string[][];
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class GoogleWorkspaceService {
  private oauth2Client: any;
  private calendar: calendar_v3.Calendar | null = null;
  private tasks: tasks_v1.Tasks | null = null;
  private docs: docs_v1.Docs | null = null;
  private sheets: sheets_v4.Sheets | null = null;
  private drive: drive_v3.Drive | null = null;

  constructor(credentials?: GoogleWorkspaceCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google/callback'
    );

    if (credentials) {
      this.setCredentials(credentials);
    }
  }

  setCredentials(credentials: GoogleWorkspaceCredentials) {
    this.oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
      expiry_date: credentials.expiryDate
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.tasks = google.tasks({ version: 'v1', auth: this.oauth2Client });
    this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/cloud-platform'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent'
    });
  }

  async exchangeCode(code: string): Promise<GoogleWorkspaceCredentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
    };
  }

  async createCalendarEvent(params: CalendarEventParams): Promise<ToolResult> {
    if (!this.calendar) {
      return { success: false, error: 'Google Calendar not connected' };
    }

    try {
      const event: calendar_v3.Schema$Event = {
        summary: params.summary,
        description: params.description,
        start: {
          dateTime: params.startTime,
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: params.endTime,
          timeZone: 'America/New_York'
        }
      };

      if (params.attendees && params.attendees.length > 0) {
        event.attendees = params.attendees.map(email => ({ email }));
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all'
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          summary: response.data.summary,
          start: response.data.start?.dateTime,
          end: response.data.end?.dateTime,
          htmlLink: response.data.htmlLink
        }
      };
    } catch (error: any) {
      console.error('Calendar event creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async listCalendarEvents(maxResults: number = 10, timeMin?: string): Promise<ToolResult> {
    if (!this.calendar) {
      return { success: false, error: 'Google Calendar not connected' };
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items?.map((event: calendar_v3.Schema$Event) => ({
        id: event.id,
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description
      })) || [];

      return { success: true, data: { events } };
    } catch (error: any) {
      console.error('Calendar list error:', error);
      return { success: false, error: error.message };
    }
  }

  async createTask(params: TaskParams): Promise<ToolResult> {
    if (!this.tasks) {
      return { success: false, error: 'Google Tasks not connected' };
    }

    try {
      const task: tasks_v1.Schema$Task = {
        title: params.title,
        notes: params.notes
      };

      if (params.dueDate) {
        task.due = params.dueDate;
      }

      const response = await this.tasks.tasks.insert({
        tasklist: '@default',
        requestBody: task
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          title: response.data.title,
          notes: response.data.notes,
          due: response.data.due,
          status: response.data.status
        }
      };
    } catch (error: any) {
      console.error('Task creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async listTasks(maxResults: number = 10): Promise<ToolResult> {
    if (!this.tasks) {
      return { success: false, error: 'Google Tasks not connected' };
    }

    try {
      const response = await this.tasks.tasks.list({
        tasklist: '@default',
        maxResults
      });

      const tasks = response.data.items?.map((task: tasks_v1.Schema$Task) => ({
        id: task.id,
        title: task.title,
        notes: task.notes,
        due: task.due,
        status: task.status
      })) || [];

      return { success: true, data: { tasks } };
    } catch (error: any) {
      console.error('Tasks list error:', error);
      return { success: false, error: error.message };
    }
  }

  async createDocument(params: DocumentParams): Promise<ToolResult> {
    if (!this.docs) {
      return { success: false, error: 'Google Docs not connected' };
    }

    try {
      const response = await this.docs.documents.create({
        requestBody: {
          title: params.title
        }
      });

      const documentId = response.data.documentId!;

      if (params.content) {
        await this.docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: params.content
                }
              }
            ]
          }
        });
      }

      return {
        success: true,
        data: {
          id: documentId,
          title: response.data.title,
          url: `https://docs.google.com/document/d/${documentId}/edit`
        }
      };
    } catch (error: any) {
      console.error('Document creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async createSpreadsheet(params: SpreadsheetParams): Promise<ToolResult> {
    if (!this.sheets) {
      return { success: false, error: 'Google Sheets not connected' };
    }

    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: params.title
          }
        }
      });

      const spreadsheetId = response.data.spreadsheetId!;

      const values: string[][] = [];
      if (params.headers && params.headers.length > 0) {
        values.push(params.headers);
      }
      if (params.data && params.data.length > 0) {
        values.push(...params.data);
      }

      if (values.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'A1',
          valueInputOption: 'RAW',
          requestBody: { values }
        });
      }

      return {
        success: true,
        data: {
          id: spreadsheetId,
          title: params.title,
          url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
        }
      };
    } catch (error: any) {
      console.error('Spreadsheet creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async listDrives(): Promise<ToolResult> {
    if (!this.drive) {
      return { success: false, error: 'Google Drive not connected' };
    }

    try {
      const myDrive = {
        id: 'root',
        name: 'My Drive',
        kind: 'personal',
      };

      const response = await this.drive.drives.list({
        pageSize: 50,
      });

      const sharedDrives = (response.data.drives || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        kind: 'shared',
      }));

      return { success: true, data: { drives: [myDrive, ...sharedDrives] } };
    } catch (error: any) {
      console.error('Drive list error:', error);
      return { success: false, error: error.message };
    }
  }

  async listDriveFiles(folderId: string = 'root', pageToken?: string, pageSize: number = 50): Promise<ToolResult> {
    if (!this.drive) {
      return { success: false, error: 'Google Drive not connected' };
    }

    try {
      const query = `'${folderId}' in parents and trashed = false`;
      const response = await this.drive.files.list({
        q: query,
        pageSize,
        pageToken: pageToken || undefined,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink, webViewLink, parents, shared)',
        orderBy: 'folder,name',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const files = (response.data.files || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size ? parseInt(f.size) : null,
        modifiedTime: f.modifiedTime,
        iconLink: f.iconLink,
        thumbnailLink: f.thumbnailLink,
        webViewLink: f.webViewLink,
        isFolder: f.mimeType === 'application/vnd.google-apps.folder',
        shared: f.shared || false,
      }));

      return {
        success: true,
        data: {
          files,
          nextPageToken: response.data.nextPageToken || null,
        },
      };
    } catch (error: any) {
      console.error('Drive files list error:', error);
      return { success: false, error: error.message };
    }
  }

  async createDriveFolder(name: string, parentId: string = 'root'): Promise<ToolResult> {
    if (!this.drive) {
      return { success: false, error: 'Google Drive not connected' };
    }

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id, name, mimeType, webViewLink',
        supportsAllDrives: true,
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          mimeType: response.data.mimeType,
          webViewLink: response.data.webViewLink,
        },
      };
    } catch (error: any) {
      console.error('Drive folder creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadDriveFile(name: string, content: Buffer, mimeType: string, parentId: string = 'root'): Promise<ToolResult> {
    if (!this.drive) {
      return { success: false, error: 'Google Drive not connected' };
    }

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name,
          parents: [parentId],
        },
        media: {
          mimeType,
          body: Readable.from(content),
        },
        fields: 'id, name, mimeType, size, webViewLink',
        supportsAllDrives: true,
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          mimeType: response.data.mimeType,
          size: response.data.size,
          webViewLink: response.data.webViewLink,
        },
      };
    } catch (error: any) {
      console.error('Drive file upload error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDriveFile(fileId: string): Promise<ToolResult> {
    if (!this.drive) {
      return { success: false, error: 'Google Drive not connected' };
    }

    try {
      await this.drive.files.delete({
        fileId,
        supportsAllDrives: true,
      });

      return { success: true, data: { deleted: true } };
    } catch (error: any) {
      console.error('Drive file delete error:', error);
      return { success: false, error: error.message };
    }
  }

  async executeTool(toolName: string, args: any): Promise<ToolResult> {
    switch (toolName) {
      case 'createCalendarEvent':
        return this.createCalendarEvent(args);
      case 'listCalendarEvents':
        return this.listCalendarEvents(args.maxResults, args.timeMin);
      case 'createTask':
        return this.createTask(args);
      case 'listTasks':
        return this.listTasks(args.maxResults);
      case 'createDocument':
        return this.createDocument(args);
      case 'createSpreadsheet':
        return this.createSpreadsheet(args);
      case 'listDrives':
        return this.listDrives();
      case 'listDriveFiles':
        return this.listDriveFiles(args.folderId, args.pageToken, args.pageSize);
      case 'createDriveFolder':
        return this.createDriveFolder(args.name, args.parentId);
      case 'deleteDriveFile':
        return this.deleteDriveFile(args.fileId);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }
}

export const createGoogleWorkspaceService = (credentials?: GoogleWorkspaceCredentials) => {
  return new GoogleWorkspaceService(credentials);
};
