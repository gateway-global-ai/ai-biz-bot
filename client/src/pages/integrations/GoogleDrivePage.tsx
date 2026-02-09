import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  HardDrive, Folder, FileText, Image, Film, Music, Archive,
  ChevronRight, ArrowLeft, Upload, FolderPlus, Trash2, ExternalLink,
  Loader2, RefreshCw, AlertCircle, Link2
} from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  iconLink: string;
  thumbnailLink: string | null;
  webViewLink: string;
  isFolder: boolean;
  shared: boolean;
}

interface DriveInfo {
  id: string;
  name: string;
  kind: string;
}

const BUSINESS_ID = 'default';

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFileIcon(mimeType: string, isFolder: boolean) {
  if (isFolder) return <Folder className="w-5 h-5 text-blue-400" />;
  if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-green-400" />;
  if (mimeType.startsWith('video/')) return <Film className="w-5 h-5 text-purple-400" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-yellow-400" />;
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed'))
    return <Archive className="w-5 h-5 text-orange-400" />;
  if (mimeType.includes('spreadsheet')) return <FileText className="w-5 h-5 text-emerald-400" />;
  if (mimeType.includes('presentation')) return <FileText className="w-5 h-5 text-amber-400" />;
  return <FileText className="w-5 h-5 text-slate-400" />;
}

export default function GoogleDrivePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([{ id: 'root', name: 'My Drive' }]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const currentFolderId = folderStack[folderStack.length - 1].id;

  const connectionQuery = useQuery<{ connected: boolean }>({
    queryKey: [`/api/google/connection/${BUSINESS_ID}`],
  });

  const drivesQuery = useQuery<{ success: boolean; data: { drives: DriveInfo[] } }>({
    queryKey: [`/api/google/drive/drives/${BUSINESS_ID}`],
    enabled: connectionQuery.data?.connected === true,
  });

  const filesQuery = useQuery<{ success: boolean; data: { files: DriveFile[]; nextPageToken: string | null } }>({
    queryKey: [`/api/google/drive/files/${BUSINESS_ID}`, currentFolderId],
    queryFn: async () => {
      const res = await fetch(`/api/google/drive/files/${BUSINESS_ID}?folderId=${currentFolderId}`);
      if (!res.ok) throw new Error('Failed to load files');
      return res.json();
    },
    enabled: connectionQuery.data?.connected === true,
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('POST', `/api/google/drive/folder/${BUSINESS_ID}`, {
        name,
        parentId: currentFolderId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/google/drive/files/${BUSINESS_ID}`, currentFolderId] });
      setShowNewFolder(false);
      setNewFolderName('');
      toast({ title: 'Folder created' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to create folder', description: err.message, variant: 'destructive' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parentId', currentFolderId);
      const res = await fetch(`/api/google/drive/upload/${BUSINESS_ID}`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/google/drive/files/${BUSINESS_ID}`, currentFolderId] });
      toast({ title: 'File uploaded' });
    },
    onError: (err: any) => {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest('DELETE', `/api/google/drive/files/${BUSINESS_ID}/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/google/drive/files/${BUSINESS_ID}`, currentFolderId] });
      toast({ title: 'File deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    },
  });

  const navigateToFolder = useCallback((file: DriveFile) => {
    setFolderStack(prev => [...prev, { id: file.id, name: file.name }]);
  }, []);

  const navigateBack = useCallback(() => {
    if (folderStack.length > 1) {
      setFolderStack(prev => prev.slice(0, -1));
    }
  }, [folderStack]);

  const navigateToBreadcrumb = useCallback((index: number) => {
    setFolderStack(prev => prev.slice(0, index + 1));
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = '';
    }
  }, [uploadMutation]);

  const handleConnect = async () => {
    try {
      const res = await fetch(`/api/google/auth-url?businessId=${BUSINESS_ID}`);
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      toast({ title: 'Connection failed', variant: 'destructive' });
    }
  };

  const isConnected = connectionQuery.data?.connected === true;
  const files = filesQuery.data?.data?.files || [];
  const folders = files.filter(f => f.isFolder);
  const nonFolders = files.filter(f => !f.isFolder);
  const sortedFiles = [...folders, ...nonFolders];

  if (connectionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-20">
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
              <HardDrive className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2" data-testid="text-drive-connect-title">Connect Google Drive</h2>
              <p className="text-slate-400 text-sm">
                Connect your Google account to browse, upload, and manage files in your Google Drive directly from this dashboard.
              </p>
            </div>
            <Button onClick={handleConnect} className="bg-blue-600" data-testid="button-connect-google">
              <Link2 className="w-4 h-4 mr-2" />
              Connect Google Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white" data-testid="text-drive-title">Google Drive</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/google/drive/files/${BUSINESS_ID}`, currentFolderId] })}
            data-testid="button-refresh-files"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewFolder(!showNewFolder)}
            data-testid="button-new-folder"
          >
            <FolderPlus className="w-4 h-4 mr-1" /> New Folder
          </Button>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            data-testid="button-upload-file"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1" />
            )}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            data-testid="input-file-upload"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 text-sm text-slate-400 flex-wrap">
        {folderStack.map((folder, idx) => (
          <span key={folder.id} className="flex items-center gap-1">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
            <button
              onClick={() => navigateToBreadcrumb(idx)}
              className={`hover:text-white transition-colors ${idx === folderStack.length - 1 ? 'text-white font-medium' : ''}`}
              data-testid={`breadcrumb-${idx}`}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </div>

      {showNewFolder && (
        <Card className="bg-slate-900/80 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FolderPlus className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="bg-slate-800 border-slate-600 flex-1"
                onKeyDown={(e) => e.key === 'Enter' && newFolderName && createFolderMutation.mutate(newFolderName)}
                autoFocus
                data-testid="input-folder-name"
              />
              <Button
                size="sm"
                onClick={() => newFolderName && createFolderMutation.mutate(newFolderName)}
                disabled={!newFolderName || createFolderMutation.isPending}
                data-testid="button-create-folder"
              >
                {createFolderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {folderStack.length > 1 && (
        <button
          onClick={navigateBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          data-testid="button-navigate-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {folderStack[folderStack.length - 2].name}
        </button>
      )}

      <Card className="bg-slate-900/80 border-slate-700">
        <CardContent className="p-0">
          {filesQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : filesQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p>Failed to load files</p>
              <Button variant="outline" size="sm" onClick={() => filesQuery.refetch()} data-testid="button-retry-files">
                Retry
              </Button>
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Folder className="w-10 h-10 text-slate-600" />
              <p className="text-sm">This folder is empty</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)} data-testid="button-empty-new-folder">
                  <FolderPlus className="w-4 h-4 mr-1" /> New Folder
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} data-testid="button-empty-upload">
                  <Upload className="w-4 h-4 mr-1" /> Upload File
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                <span>Name</span>
                <span className="w-20 text-right">Size</span>
                <span className="w-28 text-right">Modified</span>
                <span className="w-20 text-right">Actions</span>
              </div>
              {sortedFiles.map((file) => (
                <div
                  key={file.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center hover-elevate cursor-pointer group"
                  data-testid={`file-row-${file.id}`}
                >
                  <div
                    className="flex items-center gap-3 min-w-0"
                    onClick={() => file.isFolder ? navigateToFolder(file) : undefined}
                  >
                    {getFileIcon(file.mimeType, file.isFolder)}
                    <span className="truncate text-sm text-slate-200 group-hover:text-white">
                      {file.name}
                    </span>
                    {file.shared && (
                      <Badge className="bg-slate-700 text-slate-300 text-[10px]">Shared</Badge>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 w-20 text-right">
                    {file.isFolder ? '--' : formatFileSize(file.size)}
                  </span>
                  <span className="text-xs text-slate-500 w-28 text-right">
                    {formatDate(file.modifiedTime)}
                  </span>
                  <div className="flex items-center gap-1 w-20 justify-end visibility-container">
                    {file.webViewLink && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); window.open(file.webViewLink, '_blank'); }}
                        data-testid={`button-open-${file.id}`}
                      >
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${file.name}"?`)) {
                          deleteMutation.mutate(file.id);
                        }
                      }}
                      data-testid={`button-delete-${file.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
