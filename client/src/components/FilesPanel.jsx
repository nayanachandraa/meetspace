import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL;

function formatSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  return '📄';
}

function timeAgo(dateStr) {
  const diffMs = new Date() - new Date(dateStr);
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

export default function FilesPanel() {
  const { accessToken } = useAuth();
  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };
  const fileInputRef = useRef(null);

  // path is an array of {id, name}; empty = root
  const [path, setPath] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');

  const currentFolderId = path.length ? path[path.length - 1].id : null;

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = currentFolderId ? `?parent=${currentFolderId}` : '';
      const fileParams = currentFolderId ? `?folder=${currentFolderId}` : '';
      const [foldersRes, filesRes] = await Promise.all([
        axios.get(`${API_URL}/api/files/folders${params}`, authHeader),
        axios.get(`${API_URL}/api/files${fileParams}`, authHeader)
      ]);
      setFolders(foldersRes.data.folders || []);
      setFiles(filesRes.data.files || []);
    } catch {
      setError('Could not load files');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, accessToken]);

  const loadRecent = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/files/recent`, authHeader);
      setRecent(res.data.files || []);
    } catch {
      // non-critical
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => { loadCurrent(); }, [loadCurrent]);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  const openFolder = (folder) => setPath((prev) => [...prev, { id: folder._id, name: folder.name }]);
  const goToCrumb = (index) => setPath((prev) => prev.slice(0, index + 1));
  const goHome = () => setPath([]);

  const createFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await axios.post(`${API_URL}/api/files/folders`, {
        name: newFolderName.trim(),
        parentFolder: currentFolderId
      }, authHeader);
      setNewFolderName('');
      setShowNewFolder(false);
      loadCurrent();
    } catch {
      alert('Could not create folder');
    }
  };

  const deleteFolder = async (folderId) => {
    if (!confirm('Delete this folder and its files?')) return;
    try {
      await axios.delete(`${API_URL}/api/files/folders/${folderId}`, authHeader);
      loadCurrent();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete folder');
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) formData.append('folderId', currentFolderId);
    try {
      await axios.post(`${API_URL}/api/files/upload`, formData, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'multipart/form-data' }
      });
      loadCurrent();
      loadRecent();
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return;
    try {
      await axios.delete(`${API_URL}/api/files/${fileId}`, authHeader);
      loadCurrent();
      loadRecent();
    } catch {
      alert('Could not delete file');
    }
  };

  return (
    <div>
      <div className="section-header">
        <div className="breadcrumbs">
          <span className="crumb" onClick={goHome}>Home</span>
          {path.map((p, i) => (
            <span key={p.id}>
              <span className="crumb-sep">/</span>
              <span className="crumb" onClick={() => goToCrumb(i)}>{p.name}</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="outlined small" onClick={() => setShowNewFolder((s) => !s)}>+ New Folder</button>
          <input type="file" ref={fileInputRef} onChange={uploadFile} style={{ display: 'none' }} />
          <button className="primary small" onClick={() => fileInputRef.current.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : '⬆ Upload'}
          </button>
        </div>
      </div>

      {showNewFolder && (
        <form className="schedule-form" onSubmit={createFolder}>
          <input placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus />
          <button className="primary" type="submit">Create</button>
        </form>
      )}

      {error && <p className="error-text">{error}</p>}

      {!currentFolderId && recent.length > 0 && (
        <>
          <h3 style={{ fontSize: '15px', margin: '18px 0 12px' }}>Recent Files</h3>
          <div className="activity-grid" style={{ marginBottom: '26px' }}>
            {recent.map((f) => (
              <a className="activity-card" key={f._id} href={`${API_URL}${f.fileUrl}`} target="_blank" rel="noreferrer">
                <div className="activity-card-icon">{fileIcon(f.mimeType)}</div>
                <div className="activity-card-title">{f.name}</div>
                <div className="muted-text">{timeAgo(f.createdAt)} · {formatSize(f.sizeBytes)}</div>
              </a>
            ))}
          </div>
        </>
      )}

      <h3 style={{ fontSize: '15px', margin: '18px 0 12px' }}>Folders</h3>
      {loading && <p className="muted-text">Loading…</p>}
      {!loading && folders.length === 0 && <p className="muted-text" style={{ marginBottom: '16px' }}>No folders yet.</p>}
      <div className="folder-grid">
        {folders.map((folder) => (
          <div className="folder-card" key={folder._id}>
            <div className="folder-card-main" onClick={() => openFolder(folder)}>
              <span className="folder-icon">📁</span>
              <span>{folder.name}</span>
            </div>
            <button className="icon-button" onClick={() => deleteFolder(folder._id)} title="Delete folder">✕</button>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: '15px', margin: '22px 0 12px' }}>Files</h3>
      {!loading && files.length === 0 && <p className="muted-text">No files in this folder yet.</p>}
      <div className="activity-grid wide-grid">
        {files.map((f) => (
          <div className="activity-card file-card" key={f._id}>
            <a href={`${API_URL}${f.fileUrl}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="activity-card-icon">{fileIcon(f.mimeType)}</div>
              <div className="activity-card-title">{f.name}</div>
              <div className="muted-text">{timeAgo(f.createdAt)} · {formatSize(f.sizeBytes)}</div>
            </a>
            <button className="icon-button file-delete" onClick={() => deleteFile(f._id)} title="Delete file">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
