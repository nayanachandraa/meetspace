import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function Reports() {
  const { sessionId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rooms/reports/${sessionId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        setSession(res.data);
      } catch {
        setError('Report not found');
      }
    })();
  }, [sessionId, accessToken]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`${API_URL}/api/rooms/reports/${sessionId}/pdf`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `meeting-report-${sessionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not download the PDF report');
    } finally {
      setDownloading(false);
    }
  };

  if (error) return <div className="reports-page"><p>{error}</p></div>;
  if (!session) return <div className="reports-page"><p>Loading report…</p></div>;

  const durationMin = session.endTime
    ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)
    : null;

  return (
    <div className="reports-page">
      <h2>Meeting Summary</h2>
      <div className="report-card">
        <p><strong>Room:</strong> {session.roomId?.title}</p>
        <p><strong>Duration:</strong> {durationMin != null ? `${durationMin} min` : 'In progress'}</p>
        <p><strong>Chat messages:</strong> {session.chatCount}</p>
        <p><strong>Files shared:</strong> {session.filesShared}</p>
        <p><strong>Attendees:</strong> {session.attendance?.length || 0}</p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="primary" onClick={downloadPdf} disabled={downloading}>
          {downloading ? 'Preparing PDF…' : 'Download PDF Report'}
        </button>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    </div>
  );
}
