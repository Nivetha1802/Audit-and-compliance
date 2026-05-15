import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X,
  User,
  MessageSquare,
  Send,
  Plus
} from 'lucide-react';
import { taskApi, userApi, projectApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

const TaskDetailModal = ({ 
  selectedTask, 
  users, 
  projects, 
  user, 
  onClose, 
  handleStatusChange,
  loadingComments,
  comments,
  handleAddComment,
  newComment,
  setNewComment
}) => {
  if (!selectedTask) return null;
  
  const assignee = users.find(u => String(u.id).toLowerCase() === String(selectedTask.assignedTo).toLowerCase());
  const project = projects.find(p => String(p.id).toLowerCase() === String(selectedTask.projectId).toLowerCase());
  
  const isAssigned = (selectedTask.assignedTo && user?.id && String(user.id).toLowerCase() === String(selectedTask.assignedTo).toLowerCase()) || 
                    (user?.email && assignee?.email && user.email.toLowerCase() === assignee.email.toLowerCase());

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Task Details</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>
        
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{assignee?.fullName || 'Unassigned'}</div>
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
                  <button onClick={() => handleStatusChange(selectedTask.id, 'COMPLETED')} style={{ flex: 1, backgroundColor: '#10b981', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Mark as Completed</button>
                )}
                {selectedTask.status === 'PENDING' && (
                  <button onClick={() => handleStatusChange(selectedTask.id, 'IN_PROGRESS')} style={{ flex: 1, backgroundColor: '#3b82f6', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Start Task</button>
                )}
                {selectedTask.status === 'COMPLETED' && (
                  <button onClick={() => handleStatusChange(selectedTask.id, 'IN_PROGRESS')} style={{ flex: 1, backgroundColor: '#f59e0b', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Re-open Task</button>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#fff7ed', color: '#9a3412', borderRadius: '8px', fontSize: '14px', textAlign: 'center', border: '1px solid #fed7aa' }}>Only the assigned user can modify this task's status.</div>
            )}
          </div>
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
                <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }} />
                <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}><Send size={16} /></button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateTaskModal = ({ 
  isOpen, 
  onClose, 
  users, 
  projects, 
  handleCreate 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    projectId: '',
    priority: 'MEDIUM'
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCreate(formData);
    setFormData({ title: '', description: '', assignedTo: '', projectId: '', priority: 'MEDIUM' });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Create New Task</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Title</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="Task title" />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Description</label>
            <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '100px' }} placeholder="Task description" />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Project</label>
            <select required value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Assign To</label>
            <select required value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <option value="">Select User</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Priority</label>
            <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Tasks() {
  const { user } = useAuth();
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const riskId = queryParams.get('riskId');
    fetchData(riskId);
  }, [location.search]);

  useEffect(() => {
    if (isViewModalOpen && selectedTask) {
      fetchComments(selectedTask.id);
    }
  }, [isViewModalOpen, selectedTask]);

  const fetchData = async (riskIdFromUrl) => {
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

      if (riskIdFromUrl) {
        const task = tasksRes.data.find(t => String(t.riskId).toLowerCase() === String(riskIdFromUrl).toLowerCase());
        if (task) {
          setSelectedTask(task);
          setIsViewModalOpen(true);
        }
      }
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
      const tasksRes = await taskApi.getAll();
      setTasks(tasksRes.data);
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCreateTask = async (formData) => {
    try {
      await taskApi.create(formData);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
      alert(error.response?.data?.message || 'Failed to create task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading tasks...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Tasks</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Manage and track mitigation actions</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              backgroundColor: '#2563eb', 
              color: 'white', 
              padding: '10px 16px', 
              borderRadius: '8px', 
              border: 'none', 
              fontWeight: '600', 
              cursor: 'pointer' 
            }}
          >
            <Plus size={20} />
            Create Task
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
          <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} />
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
                <td style={{ padding: '16px', fontSize: '14px' }}>{projects.find(p => p.id === task.projectId)?.name || 'N/A'}</td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>{users.find(u => String(u.id).toLowerCase() === String(task.assignedTo).toLowerCase())?.fullName?.charAt(0) || '?'}</div>
                    <span style={{ fontSize: '14px' }}>{users.find(u => String(u.id).toLowerCase() === String(task.assignedTo).toLowerCase())?.fullName || (task.assignedTo ? 'User Not Found' : 'Unassigned')}</span>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', backgroundColor: getPriorityColor(task.priority) }}>{task.priority}</span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{getStatusIcon(task.status)}<span style={{ fontSize: '14px', fontWeight: '500' }}>{task.status}</span></div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button 
                    onClick={() => { setSelectedTask(task); setIsViewModalOpen(true); }}
                    style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isViewModalOpen && (
        <TaskDetailModal selectedTask={selectedTask} users={users} projects={projects} user={user} onClose={() => setIsViewModalOpen(false)} handleStatusChange={handleStatusChange} loadingComments={loadingComments} comments={comments} handleAddComment={handleAddComment} newComment={newComment} setNewComment={setNewComment} />
      )}
      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        users={users} 
        projects={projects} 
        handleCreate={handleCreateTask} 
      />
    </div>
  );
}
