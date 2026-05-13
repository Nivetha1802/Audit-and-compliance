import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X,
  User,
  MessageSquare,
  Send
} from 'lucide-react';
import { taskApi, userApi, projectApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { user } = useAuth();
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isViewModalOpen && selectedTask) {
      fetchComments(selectedTask.id);
    }
  }, [isViewModalOpen, selectedTask]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, usersRes, projectsRes] = await Promise.all([
        taskApi.getAll(),
        userApi.getAll(),
        projectApi.getAll()
      ]);
      setTasks(tasksRes.data);
      setUsers(usersRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (taskId) => {
    try {
      setLoadingComments(true);
      const res = await taskApi.getComments(taskId);
      setComments(res.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await taskApi.addComment(selectedTask.id, newComment);
      setNewComment('');
      fetchComments(selectedTask.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskApi.updateStatus(taskId, newStatus);
      fetchData();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return '#fee2e2';
      case 'MEDIUM': return '#ffedd5';
      case 'LOW': return '#f1f5f9';
      default: return '#f1f5f9';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
      case 'IN_PROGRESS': return <Clock size={16} style={{ color: '#3b82f6' }} />;
      default: return <AlertCircle size={16} style={{ color: '#64748b' }} />;
    }
  };

  const TaskDetailModal = () => {
    if (!selectedTask) return null;
    const assignee = users.find(u => u.id === selectedTask.assignedTo);
    const project = projects.find(p => p.id === selectedTask.projectId);
    
    // Permission check: ID or Email match
    const isAssigned = user?.id === selectedTask.assignedTo || 
                      user?.email?.toLowerCase() === assignee?.email?.toLowerCase() ||
                      user?.role === 'ADMIN';

    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Task Details</h2>
            <button onClick={() => setIsViewModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
          </div>
          
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left side: Task Info */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', borderRight: '1px solid #e2e8f0' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Title</label>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginTop: '4px' }}>{selectedTask.title}</div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Description</label>
                <p style={{ color: '#334155', lineHeight: '1.6', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{selectedTask.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {getStatusIcon(selectedTask.status)}
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{selectedTask.status}</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Priority</label>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: getPriorityColor(selectedTask.priority) }}>
                      {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <User size={20} style={{ color: '#64748b' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Assigned To</div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{assignee?.name || 'Unassigned'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertCircle size={20} style={{ color: '#64748b' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Project</div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{project?.name || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {isAssigned ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  {selectedTask.status !== 'COMPLETED' && (
                    <button 
                      onClick={() => handleStatusChange(selectedTask.id, 'COMPLETED')}
                      style={{ flex: 1, backgroundColor: '#10b981', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Mark as Completed
                    </button>
                  )}
                  {selectedTask.status === 'PENDING' && (
                    <button 
                      onClick={() => handleStatusChange(selectedTask.id, 'IN_PROGRESS')}
                      style={{ flex: 1, backgroundColor: '#3b82f6', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Start Task
                    </button>
                  )}
                  {selectedTask.status === 'COMPLETED' && (
                    <button 
                      onClick={() => handleStatusChange(selectedTask.id, 'IN_PROGRESS')}
                      style={{ flex: 1, backgroundColor: '#f59e0b', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Re-open Task
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '12px', backgroundColor: '#fff7ed', color: '#9a3412', borderRadius: '8px', fontSize: '14px', textAlign: 'center', border: '1px solid #fed7aa' }}>
                  Only the assigned user can modify this task's status.
                </div>
              )}
            </div>

            {/* Right side: Comments */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={18} style={{ color: '#64748b' }} />
                <span style={{ fontWeight: 'bold', color: '#475569' }}>Comments</span>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {loadingComments ? (
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '20px' }}>Loading...</div>
                ) : comments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '20px' }}>No comments yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {comments.map((c) => (
                      <div key={c.id} style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{c.userName}</span>
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ color: '#475569' }}>{c.comment}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment} style={{ padding: '16px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                  />
                  <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading tasks...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Tasks</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Manage and track mitigation actions</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
          <input 
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '16px', fontWeight: '600', color: '#475569' }}>Task</th>
              <th style={{ padding: '16px', fontWeight: '600', color: '#475569' }}>Project</th>
              <th style={{ padding: '16px', fontWeight: '600', color: '#475569' }}>Assigned To</th>
              <th style={{ padding: '16px', fontWeight: '600', color: '#475569' }}>Priority</th>
              <th style={{ padding: '16px', fontWeight: '600', color: '#475569' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{task.title}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Due: {new Date(task.createdAt).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px' }}>
                  {projects.find(p => p.id === task.projectId)?.name || 'N/A'}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                      {users.find(u => u.id === task.assignedTo)?.name?.charAt(0) || '?'}
                    </div>
                    <span style={{ fontSize: '14px' }}>{users.find(u => u.id === task.assignedTo)?.name || 'Unassigned'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: getPriorityColor(task.priority) }}>
                    {task.priority}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getStatusIcon(task.status)}
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{task.status}</span>
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button 
                    onClick={() => {
                      setSelectedTask(task);
                      setIsViewModalOpen(true);
                    }}
                    style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isViewModalOpen && <TaskDetailModal />}
    </div>
  );
}
