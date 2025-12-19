import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { User, UserRole, AttendanceRecord, SystemSettings } from '../types';
import { getUsers, saveUser, updateUser, getAttendanceReport, checkBackendConnection, getSystemSettings, saveSystemSettings } from '../services/storage';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { MOCK_SUBJECTS } from '../constants';
import { Plus, UserPlus, Users, Loader, Database, Eye, EyeOff, Shield, FileText, Download, Filter, Wifi, WifiOff, ChevronRight, Clock, Calendar, BookOpen, Check, Settings as SettingsIcon, Save, Bell, School, Search, Pencil, X, QrCode, GraduationCap } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // QR Code Modal State
  const [selectedQrUser, setSelectedQrUser] = useState<User | null>(null);

  const [newUser, setNewUser] = useState<{
    id: string;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    subjects: string[];
    teacherIds: string[];
  }>({ 
    id: '',
    name: '', 
    email: '', 
    password: '', 
    role: UserRole.TEACHER,
    subjects: [],
    teacherIds: []
  });
  
  // Custom subject input state
  const [subjectInput, setSubjectInput] = useState('');

  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'settings'>('users');
  const [isConnected, setIsConnected] = useState(false);

  // User Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Report State
  const [reportFilters, setReportFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    subject: 'All'
  });
  const [reportResults, setReportResults] = useState<AttendanceRecord[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    schoolName: '',
    academicYear: '',
    systemNotification: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    checkBackendConnection().then(setIsConnected);
    getSystemSettings().then(setSettings).catch(console.error);
  }, []);

  const generateNextTeacherId = (currentUsers: User[]) => {
      const teacherIds = currentUsers
          .filter(u => u.role === UserRole.TEACHER && u.id.startsWith('TC'))
          .map(u => {
              const numStr = u.id.replace('TC', '');
              const num = parseInt(numStr);
              return isNaN(num) ? 0 : num;
          });
      
      const maxId = teacherIds.length > 0 ? Math.max(...teacherIds) : 0;
      return `TC${maxId + 1}`;
  };

  const handleEditClick = (user: User) => {
      setEditingUserId(user.id);
      setNewUser({
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password || '',
          role: user.role,
          subjects: user.subjects || [],
          teacherIds: user.teacherIds || []
      });
      setShowAddForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setShowAddForm(false);
      setEditingUserId(null);
      setNewUser({ id: '', name: '', email: '', password: '', role: UserRole.TEACHER, subjects: [], teacherIds: [] });
      setSubjectInput('');
      setError('');
  };

  const handleAddNewClick = () => {
    if (showAddForm) {
        cancelEdit();
    } else {
        const nextId = generateNextTeacherId(users);
        setNewUser(prev => ({ ...prev, role: UserRole.TEACHER, id: nextId }));
        setShowAddForm(true);
    }
  };

  const handleRoleChange = (role: UserRole) => {
      if (role === UserRole.TEACHER) {
          const nextId = generateNextTeacherId(users);
          setNewUser(prev => ({ ...prev, role, id: nextId, subjects: [], teacherIds: [] }));
      } else {
          setNewUser(prev => ({ ...prev, role, id: '', subjects: [], teacherIds: [] }));
      }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if(!newUser.name || !newUser.email || !newUser.password || !newUser.id) {
        setError("All fields are required, including User ID");
        return;
      }

      // Check for duplicate ID if creating new user
      if (!editingUserId) {
          const idExists = users.some(u => u.id === newUser.id);
          if (idExists) {
              setError(`User ID "${newUser.id}" already exists. Please use a unique ID.`);
              return;
          }
      }
      
      const userData: User & { password?: string } = {
        id: newUser.id, // Use manual ID
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        subjects: newUser.role === UserRole.TEACHER ? newUser.subjects : [],
        teacherIds: newUser.role === UserRole.STUDENT ? newUser.teacherIds : [],
        createdAt: editingUserId ? users.find(u => u.id === editingUserId)?.createdAt || Date.now() : Date.now()
      };

      if (editingUserId) {
          // Update
          // If editingUserId !== newUser.id, it means ID changed (if we allowed it). 
          // Since we disable ID input during edit, this shouldn't happen, but safeguard:
          if (editingUserId !== newUser.id) {
               setError("Changing User ID is not allowed.");
               return;
          }
          await updateUser(userData);
          setUsers(prev => prev.map(u => u.id === editingUserId ? userData : u));
      } else {
          // Create
          await saveUser(userData);
          setUsers(prev => [...prev, userData]);
      }

      cancelEdit();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    }
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Add a manual subject
  const handleAddSubject = () => {
    if (subjectInput.trim() && !newUser.subjects.includes(subjectInput.trim())) {
      setNewUser(prev => ({ ...prev, subjects: [...prev.subjects, subjectInput.trim()] }));
      setSubjectInput('');
    }
  };

  const handleRemoveSubject = (subjectToRemove: string) => {
    setNewUser(prev => ({ ...prev, subjects: prev.subjects.filter(s => s !== subjectToRemove) }));
  };

  const toggleTeacherAssignment = (teacherId: string) => {
      setNewUser(prev => {
          const currentIds = prev.teacherIds || [];
          const exists = currentIds.includes(teacherId);
          if (exists) {
              return { ...prev, teacherIds: currentIds.filter(id => id !== teacherId) };
          } else {
              return { ...prev, teacherIds: [...currentIds, teacherId] };
          }
      });
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const data = await getAttendanceReport({
        startDate: reportFilters.startDate || undefined,
        endDate: reportFilters.endDate || undefined,
        subject: reportFilters.subject,
      });
      setReportResults(data);
    } catch (err) {
      console.error(err);
      alert("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage('');
    try {
        await saveSystemSettings(settings);
        setSettingsMessage('Configuration saved successfully.');
        setTimeout(() => setSettingsMessage(''), 3000);
    } catch (err) {
        setSettingsMessage('Failed to save configuration.');
    } finally {
        setSavingSettings(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Attendance Report", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Filters: ${reportFilters.subject} | ${reportFilters.startDate || 'Start'} to ${reportFilters.endDate || 'Now'}`, 14, 35);

    const tableData = reportResults.map(r => [
      r.date,
      r.studentName,
      r.subject,
      r.status,
      new Date(r.timestamp).toLocaleTimeString()
    ]);

    autoTable(doc, {
      head: [['Date', 'Student', 'Subject', 'Status', 'Time']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] } // Indigo-600
    });

    doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Filter Users Logic
  const getProcessedUsers = () => {
    let result = users.filter(u => u.role !== UserRole.ADMIN);

    // Search
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(u => 
            u.name.toLowerCase().includes(lower) || 
            u.email.toLowerCase().includes(lower) ||
            u.id.toLowerCase().includes(lower)
        );
    }

    // Role Filter
    if (filterRole !== 'ALL') {
        result = result.filter(u => u.role === filterRole);
    }

    // Sort
    result.sort((a, b) => {
        if (sortOrder === 'newest') return b.createdAt - a.createdAt;
        if (sortOrder === 'oldest') return a.createdAt - b.createdAt;
        if (sortOrder === 'name') return a.name.localeCompare(b.name);
        return 0;
    });

    return result;
  };

  const filteredUsers = getProcessedUsers();
  const teachersList = users.filter(u => u.role === UserRole.TEACHER);

  const downloadUserListPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("User Directory", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    let subtitle = "All Users";
    if (filterRole === UserRole.STUDENT) subtitle = "Student List";
    else if (filterRole === UserRole.TEACHER) subtitle = "Teacher List";
    
    if (searchTerm) subtitle += ` (Filtered: "${searchTerm}")`;
    
    doc.text(subtitle, 14, 35);

    const tableData = filteredUsers.map(u => [
      u.id,
      u.name,
      u.email,
      u.role
    ]);

    autoTable(doc, {
      head: [['ID', 'Full Name', 'Email', 'Role']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`user_directory_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadStudentsPDF = () => {
    const doc = new jsPDF();
    const students = users.filter(u => u.role === UserRole.STUDENT);
    
    doc.setFontSize(20);
    doc.text("Student Directory", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Students: ${students.length}`, 14, 35);

    const tableData = students.map(u => [
      u.id,
      u.name,
      u.email
    ]);

    autoTable(doc, {
      head: [['ID', 'Name', 'Email']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] } // Emerald-500
    });

    doc.save(`all_students_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Mobile-Friendly Tabs */}
      <div className="flex p-1 space-x-1 bg-gray-100/80 rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${
            activeTab === 'users' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
          }`}
        >
          <div className="flex items-center justify-center">
            <Database className="h-4 w-4 mr-2" />
            Users
          </div>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${
            activeTab === 'reports' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
          }`}
        >
          <div className="flex items-center justify-center">
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </div>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm ${
            activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
          }`}
        >
          <div className="flex items-center justify-center">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </div>
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="relative">
                  <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Records</h3>
                  <div className="flex items-end mt-2">
                     <p className="text-4xl font-extrabold text-gray-900 leading-none">{users.length}</p>
                     <span className="text-sm text-gray-500 ml-2 mb-1">entries</span>
                  </div>
                  <div className={`mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                      {isConnected ? 'MongoDB Connected' : 'Local Storage Mode'}
                  </div>
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl p-6 border border-indigo-100 flex flex-col justify-center items-start shadow-sm">
                <h3 className="text-indigo-900 font-bold text-lg mb-1">{editingUserId ? 'Edit Mode Active' : 'User Management'}</h3>
                <p className="text-indigo-600/80 text-sm mb-4">{editingUserId ? 'Currently modifying existing user details.' : 'Add Teachers, assign subjects, or enroll Students and assign to classes.'}</p>
                <Button onClick={handleAddNewClick} fullWidth className="md:w-auto">
                    {showAddForm ? 'Cancel Operation' : 'Add New User'}
                </Button>
            </div>
          </div>

          {showAddForm && (
              <div className="mb-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-xl animate-fade-in ring-4 ring-indigo-50">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center border-b border-gray-100 pb-4">
                  <UserPlus className="h-5 w-5 mr-2 text-indigo-600" />
                  {editingUserId ? 'Update User Details' : 'Register New User'}
                </h3>
                <form onSubmit={handleSaveUser} className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 items-start">
                   {/* User ID Input - Manual Entry */}
                   <Input
                    label="User ID / Roll No"
                    value={newUser.id}
                    onChange={e => setNewUser({ ...newUser, id: e.target.value })}
                    placeholder={newUser.role === UserRole.TEACHER ? "Auto-generated (e.g. TC1)" : "e.g. STU001"}
                    disabled={!!editingUserId || newUser.role === UserRole.TEACHER} // Disable editing of ID for existing users OR if creating a Teacher
                    className="mb-0"
                  />
                  
                  <Input
                    label="Full Name"
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="e.g. Mr. Smith"
                    className="mb-0"
                  />
                  <Input
                    label="Email ID"
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@school.com"
                    className="mb-0"
                  />
                  <Input
                    label="Password"
                    type="text" 
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="********"
                    className="mb-0"
                  />
                  <div className="w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                    <select 
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                        value={newUser.role}
                        onChange={e => handleRoleChange(e.target.value as UserRole)}
                        disabled={!!editingUserId} // Prevent role change during edit to avoid ID/Role mismatch issues
                    >
                        <option value={UserRole.TEACHER}>Teacher</option>
                        <option value={UserRole.STUDENT}>Student</option>
                    </select>
                  </div>

                  {/* Subject Assignment for Teachers - MANUAL TYPING */}
                  {newUser.role === UserRole.TEACHER && (
                    <div className="md:col-span-2 lg:col-span-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                            <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
                            Assign Class Subjects
                        </label>
                        
                        <div className="flex gap-2 mb-4 max-w-md">
                            <input 
                                type="text"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Type subject name..."
                                value={subjectInput}
                                onChange={(e) => setSubjectInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSubject();
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddSubject} className="py-2">Add</Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {newUser.subjects.map(subject => (
                                <span 
                                    key={subject}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium text-sm flex items-center shadow-sm"
                                >
                                    {subject}
                                    <button 
                                        type="button" 
                                        onClick={() => handleRemoveSubject(subject)}
                                        className="ml-2 p-0.5 hover:bg-indigo-200 rounded-full text-indigo-600 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                            {newUser.subjects.length === 0 && <span className="text-gray-400 text-sm italic">No subjects added yet. Type above to add.</span>}
                        </div>
                    </div>
                  )}
                  
                  {/* Teacher Assignment for Students */}
                  {newUser.role === UserRole.STUDENT && (
                      <div className="md:col-span-2 lg:col-span-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                            <School className="h-4 w-4 mr-2 text-indigo-600" />
                            Assign to Teachers (Classes)
                          </label>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {teachersList.length > 0 ? teachersList.map(teacher => {
                                  const isSelected = newUser.teacherIds.includes(teacher.id);
                                  return (
                                      <div 
                                          key={teacher.id}
                                          onClick={() => toggleTeacherAssignment(teacher.id)}
                                          className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition-all ${
                                              isSelected 
                                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'
                                          }`}
                                      >
                                          <div className="flex flex-col">
                                              <span className="text-sm font-semibold">{teacher.name}</span>
                                              <span className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                  {teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects.join(', ') : 'No subjects'}
                                              </span>
                                          </div>
                                          {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                                      </div>
                                  )
                              }) : (
                                  <p className="text-gray-500 text-sm italic col-span-3">No teachers available. Please create teachers first.</p>
                              )}
                          </div>
                      </div>
                  )}

                  <div className="md:col-span-2 lg:col-span-4 mt-2 flex gap-3">
                    <Button type="submit" fullWidth className="py-3 text-base">
                        {editingUserId ? 'Update User' : 'Save to Database'}
                    </Button>
                    {editingUserId && (
                        <Button type="button" variant="secondary" onClick={cancelEdit} className="py-3 text-base">
                            Cancel
                        </Button>
                    )}
                  </div>
                </form>
                {error && <p className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-lg flex items-center"><Shield className="h-4 w-4 mr-2"/> {error}</p>}
              </div>
            )}

          {/* Search and Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
             <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search by name, email or ID..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <select 
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-gray-700 cursor-pointer"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                >
                    <option value="ALL">All Roles</option>
                    <option value={UserRole.TEACHER}>Teachers</option>
                    <option value={UserRole.STUDENT}>Students</option>
                </select>
                <select 
                     className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-gray-700 cursor-pointer"
                     value={sortOrder}
                     onChange={(e) => setSortOrder(e.target.value as any)}
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Name (A-Z)</option>
                </select>
             </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center mr-2">
                    <Users className="h-5 w-5 mr-2 text-indigo-600" />
                    Database Entries
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={downloadUserListPDF} className="py-1.5 px-3 text-xs h-8 flex items-center" title="Export Current View">
                        <Download className="h-3 w-3 mr-1.5" />
                        Export View
                    </Button>
                    <Button variant="secondary" onClick={downloadStudentsPDF} className="py-1.5 px-3 text-xs h-8 flex items-center bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 border" title="Export All Students">
                        <GraduationCap className="h-3 w-3 mr-1.5" />
                        Students List
                    </Button>
                  </div>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-200/50 px-2 py-1 rounded-lg">
                Showing {filteredUsers.length} of {users.length - 1} users
              </span>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            ) : (
            <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name / Role</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Password</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                                <Search className="h-10 w-10 text-gray-200 mb-2" />
                                <p>No matching records found.</p>
                                {(searchTerm || filterRole !== 'ALL') && (
                                    <button 
                                        onClick={() => {setSearchTerm(''); setFilterRole('ALL');}}
                                        className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 shadow-sm ${u.role === UserRole.TEACHER ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {u.role === UserRole.TEACHER ? <Shield className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">{u.name}</div>
                                    <div className="text-xs text-gray-500 font-medium">{u.role}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            <div className="flex items-center bg-gray-50 px-3 py-1 rounded-md w-fit">
                                <span className="mr-2 tracking-widest">
                                    {showPasswords[u.id] ? (u.password || 'N/A') : '••••••'}
                                </span>
                                <button onClick={() => togglePassword(u.id)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                                    {showPasswords[u.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </button>
                            </div>
                        </td>
                         <td className="px-6 py-4">
                             {u.role === UserRole.TEACHER ? (
                                 <div className="flex flex-wrap gap-1">
                                    {u.subjects && u.subjects.length > 0 ? u.subjects.map(s => (
                                        <span key={s} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {s}
                                        </span>
                                    )) : <span className="text-xs text-gray-400 italic">No subjects</span>}
                                 </div>
                             ) : (
                                <div className="flex flex-wrap gap-1">
                                    {u.teacherIds && u.teacherIds.length > 0 ? (
                                        u.teacherIds.map(tid => {
                                            const teacher = users.find(t => t.id === tid);
                                            return teacher ? (
                                                <span key={tid} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    {teacher.name}
                                                </span>
                                            ) : null;
                                        })
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No teachers assigned</span>
                                    )}
                                </div>
                             )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                          {u.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                                {u.role !== UserRole.TEACHER && (
                                <button
                                    onClick={() => setSelectedQrUser(u)}
                                    className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                                    title="View QR Code"
                                >
                                    <QrCode className="h-4 w-4" />
                                </button>
                                )}
                                <button 
                                    onClick={() => handleEditClick(u)}
                                    className="text-gray-400 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                                    title="Edit User"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                         <Search className="h-8 w-8 text-gray-200 mb-2" />
                         <p>No matching records found.</p>
                    </div>
                ) : (
                    filteredUsers.map((u) => (
                        <div key={u.id} className="p-4 flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm ${u.role === UserRole.TEACHER ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {u.role === UserRole.TEACHER ? <Shield className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{u.name}</p>
                                        <p className="text-xs text-gray-500">{u.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    {u.role !== UserRole.TEACHER && (
                                    <button onClick={() => setSelectedQrUser(u)} className="text-indigo-600 bg-indigo-50 p-2 rounded-lg mr-2">
                                        <QrCode className="h-4 w-4" />
                                    </button>
                                    )}
                                    <button 
                                        onClick={() => handleEditClick(u)}
                                        className="text-gray-400 p-2 hover:text-indigo-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {u.role === UserRole.TEACHER && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                     {u.subjects && u.subjects.length > 0 ? u.subjects.map(s => (
                                        <span key={s} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {s}
                                        </span>
                                    )) : <span className="text-xs text-gray-400 italic pl-1">No subjects assigned</span>}
                                </div>
                            )}

                            {u.role === UserRole.STUDENT && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {u.teacherIds && u.teacherIds.length > 0 ? (
                                        u.teacherIds.map(tid => {
                                            const teacher = users.find(t => t.id === tid);
                                            return teacher ? (
                                                <span key={tid} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    {teacher.name}
                                                </span>
                                            ) : null;
                                        })
                                    ) : (
                                        <span className="text-xs text-gray-400 italic pl-1">No teachers assigned</span>
                                    )}
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Email:</span>
                                    <span className="font-medium text-gray-900">{u.email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Password:</span>
                                    <span className="font-mono font-medium text-gray-900">{showPasswords[u.id] ? u.password : '••••••••'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ID:</span>
                                    <span className="font-mono text-gray-400">{u.id}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            </>
            )}
          </div>
        </>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <div className="md:col-span-2 space-y-6">
                <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <SettingsIcon className="h-6 w-6 mr-3 text-indigo-600" />
                            System Configuration
                        </h2>
                        {settingsMessage && (
                            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${settingsMessage.includes('Failed') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                {settingsMessage}
                            </span>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Input 
                                label="School / Organization Name"
                                placeholder="e.g. Springfield High School"
                                value={settings.schoolName}
                                onChange={e => setSettings({...settings, schoolName: e.target.value})}
                            />
                            <Input 
                                label="Academic Year"
                                placeholder="e.g. 2024-2025"
                                value={settings.academicYear}
                                onChange={e => setSettings({...settings, academicYear: e.target.value})}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">System-wide Notification</label>
                            <textarea
                                className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[120px]"
                                placeholder="Enter an announcement to be displayed on all dashboards..."
                                value={settings.systemNotification}
                                onChange={e => setSettings({...settings, systemNotification: e.target.value})}
                            />
                            <p className="mt-2 text-xs text-gray-500">This message will be visible to all teachers and students upon login.</p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={savingSettings} className="flex items-center py-3 px-6">
                                {savingSettings ? <Loader className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                {savingSettings ? 'Saving...' : 'Save Configuration'}
                            </Button>
                        </div>
                    </div>
                </form>
             </div>

             <div className="space-y-6">
                 <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
                     <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                         <School className="h-6 w-6 text-white" />
                     </div>
                     <h3 className="text-lg font-bold mb-1">Current Session</h3>
                     <p className="text-indigo-200 text-sm mb-6">Active academic parameters</p>
                     
                     <div className="space-y-4">
                         <div>
                             <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider">Institution</p>
                             <p className="font-semibold text-lg">{settings.schoolName || 'Not Configured'}</p>
                         </div>
                         <div>
                             <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider">Year</p>
                             <p className="font-semibold text-lg">{settings.academicYear || 'Not Configured'}</p>
                         </div>
                     </div>
                 </div>

                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                     <h3 className="text-gray-900 font-bold flex items-center mb-4">
                         <Bell className="h-5 w-5 mr-2 text-gray-400" />
                         Preview Notification
                     </h3>
                     {settings.systemNotification ? (
                         <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                             <p className="text-amber-800 text-sm font-medium">
                                 <span className="font-bold block mb-1">📢 Announcement:</span>
                                 {settings.systemNotification}
                             </p>
                         </div>
                     ) : (
                         <p className="text-gray-400 text-sm italic">No active notifications set.</p>
                     )}
                 </div>
             </div>
         </div>
      )}

      {/* QR Code Modal for Admin */}
      {selectedQrUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedQrUser(null)}>
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl transform scale-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-1 text-gray-900">{selectedQrUser.name}</h3>
            <p className="text-gray-400 mb-6 text-sm font-mono tracking-wide">{selectedQrUser.id}</p>
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 inline-block mb-6">
                <QRCode value={selectedQrUser.id} size={220} />
            </div>
            <div>
                <Button onClick={() => setSelectedQrUser(null)} fullWidth className="py-3 rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};