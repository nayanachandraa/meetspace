import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_URL = import.meta.env.VITE_API_URL;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatWhen(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date - now;
  const diffMin = Math.round(diffMs / 60000);

  const timeLabel = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateLabel = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  if (diffMin <= 0) return { badge: 'Starting now', full: `${dateLabel} · ${timeLabel}` };
  if (diffMin < 60) return { badge: `In ${diffMin} min`, full: `${dateLabel} · ${timeLabel}` };
  if (diffMin < 24 * 60) return { badge: `In ${Math.round(diffMin / 60)}h`, full: `${dateLabel} · ${timeLabel}` };
  return { badge: dateLabel, full: timeLabel };
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

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export default function Dashboard() {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('meetings'); // meetings | activity | chat | settings
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const [upcoming, setUpcoming] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const authHeader = { headers: { Authorization: `Bearer ${accessToken}` } };

  const loadDashboardData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [upcomingRes, activityRes] = await Promise.all([
        axios.get(`${API_URL}/api/rooms/meetings/upcoming`, authHeader),
        axios.get(`${API_URL}/api/rooms/activity/feed`, authHeader)
      ]);
      setUpcoming(upcomingRes.data.meetings || []);
      setActivity(activityRes.data.activity || []);
    } catch {
      // Non-critical — dashboard still works without these sections loading
    } finally {
      setLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const createRoom = async () => {
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/rooms`, { title: title || 'Untitled Meeting' }, authHeader);
      navigate(`/lobby/${res.data.roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create room');
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/rooms/${joinCode.trim()}`, authHeader);
      navigate(`/lobby/${res.data.room._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found');
    }
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleDate) return;
    setScheduling(true);
    setError('');
    try {
      await axios.post(`${API_URL}/api/rooms/meetings/schedule`, {
        title: scheduleTitle || 'Untitled Meeting',
        scheduledFor: new Date(scheduleDate).toISOString()
      }, authHeader);
      setScheduleTitle('');
      setScheduleDate('');
      setShowSchedule(false);
      loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not schedule meeting');
    } finally {
      setScheduling(false);
    }
  };

  const startScheduled = (meeting) => navigate(`/lobby/${meeting._id}`);

  const cancelScheduled = async (meetingId) => {
    try {
      await axios.delete(`${API_URL}/api/rooms/meetings/${meetingId}/cancel`, authHeader);
      setUpcoming((prev) => prev.filter((m) => m._id !== meetingId));
    } catch {
      alert('Could not cancel this meeting');
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>MeetSpace</h2>
        <div className="user-badge">
          <span className="avatar-badge">{initials(user?.name)}</span>
          <span>{user?.name}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      <nav className="dashboard-tabs">
        <button className={tab === 'meetings' ? 'tab active' : 'tab'} onClick={() => setTab('meetings')}>Meetings</button>
        <button className={tab === 'activity' ? 'tab active' : 'tab'} onClick={() => setTab('activity')}>Activity</button>
        <button className={tab === 'chat' ? 'tab active' : 'tab'} onClick={() => setTab('chat')}>Chat</button>
        <button className={tab === 'settings' ? 'tab active' : 'tab'} onClick={() => setTab('settings')}>Settings</button>
      </nav>

      {tab === 'meetings' && (
        <main className="dashboard-main">
          <section className="greeting-block">
            <p className="greeting-date">
              {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </p>
            <h1>{getGreeting()}, {user?.name?.split(' ')[0]}.</h1>
          </section>

          <div className="dashboard-columns">
            <div className="dashboard-col">
              <div className="panel action-panel">
                <h3>Start a new meeting</h3>
                <input placeholder="Meeting title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
                <button className="primary full-width" onClick={createRoom}>▶ Start New Meeting</button>
              </div>

              <div className="panel action-panel">
                <h3>Join a meeting</h3>
                <input placeholder="Room code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
                <button className="outlined full-width" onClick={joinRoom}>Join</button>
              </div>

              {error && <p className="error-text">{error}</p>}
            </div>

            <div className="dashboard-col wide">
              <div className="section-header">
                <h3>Upcoming Meetings</h3>
                <button className="link-button" onClick={() => setShowSchedule((s) => !s)}>
                  {showSchedule ? 'Cancel' : '+ Schedule'}
                </button>
              </div>

              {showSchedule && (
                <form className="schedule-form" onSubmit={submitSchedule}>
                  <input placeholder="Meeting title (optional)" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} />
                  <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} required />
                  <button className="primary" type="submit" disabled={scheduling}>
                    {scheduling ? 'Scheduling…' : 'Schedule'}
                  </button>
                </form>
              )}

              {loadingData && <p className="muted-text">Loading…</p>}

              {!loadingData && upcoming.length === 0 && (
                <div className="empty-state">
                  <p>No upcoming meetings scheduled.</p>
                </div>
              )}

              <div className="meeting-list">
                {upcoming.map((m) => {
                  const when = formatWhen(m.scheduledFor);
                  return (
                    <div className="meeting-card" key={m._id}>
                      <div className="meeting-card-main">
                        <div className="meeting-card-title-row">
                          <span className="meeting-card-title">{m.title}</span>
                          <span className="badge">{when.badge}</span>
                        </div>
                        <span className="muted-text">{when.full}</span>
                      </div>
                      <div className="meeting-card-actions">
                        <button className="primary small" onClick={() => startScheduled(m)}>Start</button>
                        <button className="outlined small" onClick={() => cancelScheduled(m._id)}>Cancel</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="section-header" style={{ marginTop: '28px' }}>
                <h3>Recent Activity</h3>
              </div>

              {!loadingData && activity.length === 0 && (
                <div className="empty-state">
                  <p>No past meetings yet — your history will show up here.</p>
                </div>
              )}

              <div className="activity-grid">
                {activity.map((a) => (
                  <div
                    className="activity-card"
                    key={a.sessionId}
                    onClick={() => navigate(`/reports/${a.sessionId}`)}
                  >
                    <div className="activity-card-icon">📄</div>
                    <div className="activity-card-title">{a.roomTitle}</div>
                    <div className="muted-text">{timeAgo(a.endTime)} · {a.durationMin} min · {a.attendeeCount} attendee{a.attendeeCount === 1 ? '' : 's'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {tab === 'activity' && (
        <main className="dashboard-main single-column">
          <h1 style={{ marginBottom: '20px' }}>Activity</h1>
          {!loadingData && activity.length === 0 && (
            <div className="empty-state"><p>Nothing here yet — finished meetings will appear in this feed.</p></div>
          )}
          <div className="activity-grid wide-grid">
            {activity.map((a) => (
              <div className="activity-card" key={a.sessionId} onClick={() => navigate(`/reports/${a.sessionId}`)}>
                <div className="activity-card-icon">📄</div>
                <div className="activity-card-title">{a.roomTitle}</div>
                <div className="muted-text">{timeAgo(a.endTime)} · {a.durationMin} min · {a.chatCount} messages · {a.filesShared} files</div>
              </div>
            ))}
          </div>
        </main>
      )}

      {tab === 'chat' && (
        <main className="dashboard-main single-column">
          <div className="empty-state centered">
            <h3>Chat is available inside meetings</h3>
            <p className="muted-text">
              A standalone messenger outside of meetings isn't built yet — for now, chat, file sharing,
              and the whiteboard are available once you're in a live meeting room.
            </p>
          </div>
        </main>
      )}

      {tab === 'settings' && (
        <main className="dashboard-main single-column">
          <div className="panel" style={{ maxWidth: '420px' }}>
            <h3>Account</h3>
            <p className="muted-text" style={{ marginBottom: '8px' }}>Name: {user?.name}</p>
            <p className="muted-text" style={{ marginBottom: '18px' }}>Email: {user?.email}</p>
            <button className="outlined full-width" onClick={logout}>Log out</button>
          </div>
        </main>
      )}
    </div>
  );
}
