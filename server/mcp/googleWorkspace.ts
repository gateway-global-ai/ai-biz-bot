import { google, calendar_v3, tasks_v1, docs_v1, sheets_v4, drive_v3, gmail_v1, admin_directory_v1 } from 'googleapis';
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

export interface EmailParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
}

export interface DraftParams {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface UserInviteParams {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  organizationUnit?: string;
}

export interface WorkspaceStructureParams {
  businessName: string;
  businessType: string;
}

export class GoogleWorkspaceService {
  private oauth2Client: any;
  private calendar: calendar_v3.Calendar | null = null;
  private tasks: tasks_v1.Tasks | null = null;
  private docs: docs_v1.Docs | null = null;
  private sheets: sheets_v4.Sheets | null = null;
  private drive: drive_v3.Drive | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  private admin: admin_directory_v1.Admin | null = null;

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
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.admin = google.admin({ version: 'directory_v1', auth: this.oauth2Client });
  }

  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/tasks',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/admin.directory.user',
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

  async listCalendarEvents(maxResults: number = 10, timeMin?: string, timeMax?: string): Promise<ToolResult> {
    if (!this.calendar) {
      return { success: false, error: 'Google Calendar not connected' };
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || undefined,
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

  /** Drive full-text search; returns context summary for agent (read-only). */
  async searchDriveFiles(query: string, mimeType?: string): Promise<ToolResult> {
    if (!this.drive) {
      return { success: false, error: 'Google Drive not connected' };
    }

    try {
      const escapeQ = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      let q = `fullText contains '${escapeQ(query)}' and trashed = false`;
      if (mimeType) {
        q += ` and mimeType = '${escapeQ(mimeType)}'`;
      }
      const response = await this.drive.files.list({
        q,
        pageSize: 15,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const files = (response.data.files || []).map((f: any) => ({
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
      }));

      const summary = files.length === 0
        ? `No Drive items found matching "${query}".`
        : `Found ${files.length} item(s) matching "${query}": ${files.map((f: any) => f.name).join(', ')}.`;

      return {
        success: true,
        data: {
          summary,
          count: files.length,
          files,
        },
      };
    } catch (error: any) {
      console.error('Drive search error:', error);
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

  async updateTask(taskId: string, params: Partial<TaskParams> & { status?: string }): Promise<ToolResult> {
    if (!this.tasks) {
      return { success: false, error: 'Google Tasks not connected' };
    }

    try {
      const body: tasks_v1.Schema$Task = {};
      if (params.title !== undefined) body.title = params.title;
      if (params.notes !== undefined) body.notes = params.notes;
      if (params.dueDate !== undefined) body.due = params.dueDate;
      if (params.status !== undefined) body.status = params.status;

      const response = await this.tasks.tasks.patch({
        tasklist: '@default',
        task: taskId,
        requestBody: body
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
      console.error('Task update error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTask(taskId: string): Promise<ToolResult> {
    if (!this.tasks) {
      return { success: false, error: 'Google Tasks not connected' };
    }

    try {
      await this.tasks.tasks.delete({
        tasklist: '@default',
        task: taskId
      });
      return { success: true, data: { deleted: true } };
    } catch (error: any) {
      console.error('Task delete error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCalendarEvent(eventId: string, params: Partial<CalendarEventParams>): Promise<ToolResult> {
    if (!this.calendar) {
      return { success: false, error: 'Google Calendar not connected' };
    }

    try {
      const body: calendar_v3.Schema$Event = {};
      if (params.summary !== undefined) body.summary = params.summary;
      if (params.description !== undefined) body.description = params.description;
      if (params.startTime !== undefined) body.start = { dateTime: params.startTime, timeZone: 'America/New_York' };
      if (params.endTime !== undefined) body.end = { dateTime: params.endTime, timeZone: 'America/New_York' };
      if (params.attendees !== undefined) body.attendees = params.attendees.map(email => ({ email }));

      const response = await this.calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: body,
        sendUpdates: 'all'
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          summary: response.data.summary,
          start: response.data.start?.dateTime || response.data.start?.date,
          end: response.data.end?.dateTime || response.data.end?.date,
          htmlLink: response.data.htmlLink
        }
      };
    } catch (error: any) {
      console.error('Calendar event update error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCalendarEvent(eventId: string): Promise<ToolResult> {
    if (!this.calendar) {
      return { success: false, error: 'Google Calendar not connected' };
    }

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all'
      });
      return { success: true, data: { deleted: true } };
    } catch (error: any) {
      console.error('Calendar event delete error:', error);
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

  // ==========================================
  // Gmail Methods
  // ==========================================

  async sendEmail(params: EmailParams): Promise<ToolResult> {
    if (!this.gmail) {
      return { success: false, error: 'Gmail not connected' };
    }

    try {
      const { to, subject, body, from, cc, bcc } = params;
      
      // Create email message
      const lines = [
        `To: ${to}`,
        `Subject: ${subject}`,
      ];
      
      if (from) lines.push(`From: ${from}`);
      if (cc && cc.length > 0) lines.push(`Cc: ${cc.join(', ')}`);
      if (bcc && bcc.length > 0) lines.push(`Bcc: ${bcc.join(', ')}`);
      
      lines.push('', body);
      
      const email = lines.join('\n');
      const encodedMessage = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          threadId: response.data.threadId,
        },
      };
    } catch (error: any) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  async createDraft(params: DraftParams): Promise<ToolResult> {
    if (!this.gmail) {
      return { success: false, error: 'Gmail not connected' };
    }

    try {
      const { to, subject, body, from } = params;
      
      const lines = [
        `To: ${to}`,
        `Subject: ${subject}`,
      ];
      
      if (from) lines.push(`From: ${from}`);
      lines.push('', body);
      
      const email = lines.join('\n');
      const encodedMessage = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedMessage,
          },
        },
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          message: response.data.message,
        },
      };
    } catch (error: any) {
      console.error('Draft creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async listEmails(maxResults: number = 10, query?: string): Promise<ToolResult> {
    if (!this.gmail) {
      return { success: false, error: 'Gmail not connected' };
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query,
      });

      const messages = response.data.messages || [];
      const emails = [];

      for (const message of messages.slice(0, maxResults)) {
        const detail = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        const headers = detail.data.payload?.headers || [];
        emails.push({
          id: detail.data.id,
          threadId: detail.data.threadId,
          snippet: detail.data.snippet,
          from: headers.find(h => h.name === 'From')?.value,
          to: headers.find(h => h.name === 'To')?.value,
          subject: headers.find(h => h.name === 'Subject')?.value,
          date: headers.find(h => h.name === 'Date')?.value,
        });
      }

      return { success: true, data: { emails } };
    } catch (error: any) {
      console.error('Email list error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // Google Admin Directory Methods
  // ==========================================

  async createUser(params: UserInviteParams): Promise<ToolResult> {
    if (!this.admin) {
      return { success: false, error: 'Google Admin not connected' };
    }

    try {
      const { email, firstName, lastName, password, organizationUnit } = params;
      
      const response = await this.admin.users.insert({
        requestBody: {
          primaryEmail: email,
          name: {
            givenName: firstName,
            familyName: lastName,
          },
          password: password,
          changePasswordAtNextLogin: true,
          orgUnitPath: organizationUnit || '/',
        },
      });

      return {
        success: true,
        data: {
          id: response.data.id,
          email: response.data.primaryEmail,
          name: response.data.name,
          orgUnitPath: response.data.orgUnitPath,
        },
      };
    } catch (error: any) {
      console.error('User creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendUserInvitation(email: string, firstName: string, lastName: string): Promise<ToolResult> {
    if (!this.admin) {
      return { success: false, error: 'Google Admin not connected' };
    }

    try {
      // Generate a secure random password
      const tempPassword = this.generateSecurePassword();
      
      // Create the user with temporary password
      const userResult = await this.createUser({
        email,
        firstName,
        lastName,
        password: tempPassword,
      });

      if (!userResult.success) {
        return userResult;
      }

      // Send welcome email with instructions
      await this.sendEmail({
        to: email,
        subject: 'Welcome to Gateway Global AI - Your Workspace Account',
        body: `Dear ${firstName},

Welcome to Gateway Global AI! Your professional workspace account has been created.

Email: ${email}
Temporary Password: ${tempPassword}

Please sign in at https://workspace.google.com and change your password when prompted.

Your workspace includes:
- Professional email (@gatewayglobal.ai)
- Google Drive with 30GB-2TB storage
- Calendar for appointment management
- Tasks for project tracking
- Docs and Sheets for business operations
- AI-powered business tools

Get started: https://workspace.google.com

Best regards,
Gateway Global AI Team`,
      });

      return {
        success: true,
        data: {
          ...userResult.data,
          invitationSent: true,
        },
      };
    } catch (error: any) {
      console.error('User invitation error:', error);
      return { success: false, error: error.message };
    }
  }

  private generateSecurePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // ==========================================
  // Workspace Structure Generation
  // ==========================================

  async createWorkspaceStructure(params: WorkspaceStructureParams): Promise<ToolResult> {
    try {
      const { businessName, businessType } = params;
      const results: any = {
        folders: {},
        sheets: {},
        tasks: {},
        calendar: {},
      };

      // Create root business folder
      const rootFolder = await this.createDriveFolder(`${businessName} - Business Files`);
      if (!rootFolder.success) {
        return rootFolder;
      }
      results.folders.root = rootFolder.data;

      // Create sub-folders
      const subFolders = ['Clients', 'Operations', 'Marketing', 'Reports'];
      for (const folder of subFolders) {
        const result = await this.createDriveFolder(folder, rootFolder.data.id);
        if (result.success) {
          results.folders[folder.toLowerCase()] = result.data;
        }
      }

      // Create lead tracking spreadsheet
      const leadSheet = await this.createSpreadsheet({
        title: `${businessName} - Lead Tracker`,
        headers: ['Date', 'Name', 'Email', 'Phone', 'Source', 'Status', 'Notes'],
        data: [],
      });
      if (leadSheet.success) {
        results.sheets.leadTracking = leadSheet.data;
      }

      // Create initial tasks
      const initialTasks = [
        { title: 'Complete business profile setup', notes: 'Add logo, description, and contact information' },
        { title: 'Configure AI chatbot settings', notes: 'Customize greeting and responses' },
        { title: 'Set up calendar for appointments', notes: 'Add availability and booking rules' },
        { title: 'Review and customize email templates', notes: 'Personalize customer communication' },
      ];

      for (const taskData of initialTasks) {
        await this.createTask(taskData);
      }
      results.tasks.initial = initialTasks.length;

      // Create calendar template (sample appointment types)
      const sampleEvents = [
        {
          summary: `${businessType} Consultation - Sample Event`,
          description: 'This is a template event. Delete this and add your real appointments.',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        },
      ];

      for (const event of sampleEvents) {
        const result = await this.createCalendarEvent(event);
        if (result.success) {
          results.calendar.sampleEvent = result.data;
        }
      }

      return {
        success: true,
        data: results,
      };
    } catch (error: any) {
      console.error('Workspace structure creation error:', error);
      return { success: false, error: error.message };
    }
  }

  async executeTool(toolName: string, args: any): Promise<ToolResult> {
    switch (toolName) {
      case 'createCalendarEvent':
        return this.createCalendarEvent(args);
      case 'listCalendarEvents':
        return this.listCalendarEvents(args.maxResults, args.timeMin, args.timeMax);
      case 'updateCalendarEvent':
        return this.updateCalendarEvent(args.eventId, args);
      case 'deleteCalendarEvent':
        return this.deleteCalendarEvent(args.eventId);
      case 'createTask':
        return this.createTask(args);
      case 'listTasks':
        return this.listTasks(args.maxResults);
      case 'updateTask':
        return this.updateTask(args.taskId, args);
      case 'deleteTask':
        return this.deleteTask(args.taskId);
      case 'createDocument':
        return this.createDocument(args);
      case 'createSpreadsheet':
        return this.createSpreadsheet(args);
      case 'listDrives':
        return this.listDrives();
      case 'listDriveFiles':
        return this.listDriveFiles(args.folderId, args.pageToken, args.pageSize);
      case 'searchDriveFiles':
        return this.searchDriveFiles(args.query, args.mimeType);
      case 'createDriveFolder':
        return this.createDriveFolder(args.name, args.parentId);
      case 'deleteDriveFile':
        return this.deleteDriveFile(args.fileId);
      case 'sendEmail':
        return this.sendEmail(args);
      case 'createDraft':
        return this.createDraft(args);
      case 'listEmails':
        return this.listEmails(args.maxResults, args.query);
      case 'createUser':
        return this.createUser(args);
      case 'sendUserInvitation':
        return this.sendUserInvitation(args.email, args.firstName, args.lastName);
      case 'createWorkspaceStructure':
        return this.createWorkspaceStructure(args);
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }
}

export const createGoogleWorkspaceService = (credentials?: GoogleWorkspaceCredentials) => {
  return new GoogleWorkspaceService(credentials);
};
