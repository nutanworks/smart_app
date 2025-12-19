import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'react-qr-code';
import { User, UserRole, AttendanceRecord, AttendanceStatus, Notice, NoticeAttachment } from '../types';
import { getStudents, saveUser, markAttendance, updateUser, deleteUser, getAttendanceReport, getNotices, createNotice, updateNotice, deleteNotice } from '../services/storage';
import { MOCK_SUBJECTS } from '../constants';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { QRScanner } from '../components/QRScanner';
import { Users, UserPlus, QrCode, Scan, CheckCircle, AlertCircle, X, ClipboardList, Loader, WifiOff, Eye, EyeOff, XCircle, Pencil, Search, Calendar, Trash2, Save, X as CloseIcon, Clock, FileText, Download, Filter, MessageSquare, Upload, File as FileIcon, Plus, PieChart, FileSpreadsheet, Settings, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TeacherDashboardProps {
  currentUser: User;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'reports' | 'notices'>('students');
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Stats State
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, total: 0 });

  // Marks Configuration State
  const [marksConfig, setMarksConfig] = useState({
      maxCie1: 20,
      maxCie2: 20,
      maxAssignment: 10
  });
  const [showMarksConfig, setShowMarksConfig] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'cie1' | 'cie2' | 'assignment', direction: 'asc' | 'desc' }>({ 
    key: 'name', 
    direction: 'asc' 
  });

  // Modal State for Add/Edit
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState({ id: '', name: '', email: '', password: '' });
  
  const [selectedStudentQR, setSelectedStudentQR] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Calculate available subjects
  const availableSubjects = currentUser.subjects && currentUser.subjects.length > 0 
    ? currentUser.subjects 
    : MOCK_SUBJECTS;

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(availableSubjects[0]);
  const [scanResult, setScanResult] = useState<{ 
      status: 'success' | 'error', 
      message: string, 
      type?: 'network' | 'data',
      source?: 'scan' | 'manual'
  } | null>(null);

  // Manual Attendance States
  const [showManualAttendance, setShowManualAttendance] = useState(false);
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualTime, setManualTime] = useState(new Date().toTimeString().slice(0, 5));

  // Report States
  const [reportFilters, setReportFilters] = useState({
      startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      subject: availableSubjects[0] || 'All'
  });
  const [reportResults, setReportResults] = useState<AttendanceRecord[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Notices State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [newNotice, setNewNotice] = useState({ title: '', content: '' });
  const [attachments, setAttachments] = useState<NoticeAttachment[]>([]);
  const [postingNotice, setPostingNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load students and stats on mount & when subject changes
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Get Students
            const studentsData = await getStudents();
            const myStudents = studentsData.filter(s => s.teacherIds && s.teacherIds.includes(currentUser.id));
            setStudents(myStudents);

            // 2. Get Today's Attendance Stats for SELECTED SUBJECT
            const today = new Date().toISOString().split('T')[0];
            const attendanceData = await getAttendanceReport({
                startDate: today,
                endDate: today,
                subject: selectedSubject // Filter stats by current subject
            });
            
            // Filter for my students only
            const myStudentIds = new Set(myStudents.map(s => s.id));
            const myAttendance = attendanceData.filter(r => myStudentIds.has(r.studentId));

            const presentCount = myAttendance.filter(r => r.status === AttendanceStatus.PRESENT).length;
            const absentCount = myAttendance.filter(r => r.status === AttendanceStatus.ABSENT).length;

            setTodayStats({
                present: presentCount,
                absent: absentCount,
                total: myStudents.length
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [currentUser.id, selectedSubject]);

  // Load notices when tab changes
  useEffect(() => {
      if (activeTab === 'notices') {
          const loadNotices = async () => {
              try {
                  const data = await getNotices({ teacherId: currentUser.id });
                  setNotices(data);
              } catch (err) {
                  console.error(err);
              }
          };
          loadNotices();
      }
  }, [activeTab, currentUser.id]);

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validation with feedback
      if (!newStudent.id || !newStudent.name || !newStudent.email || (!editingStudentId && !newStudent.password)) {
         alert("Please fill in all required fields. Password is required for new students.");
         return;
      }

      if (editingStudentId) {
          // Update Mode
          const studentToUpdate = students.find(s => s.id === editingStudentId);
          if (studentToUpdate) {
             const updatedStudent: User & { password?: string } = {
                 ...studentToUpdate,
                 name: newStudent.name,
                 email: newStudent.email,
                 // If password field is empty during edit, keep the old password
                 password: newStudent.password || studentToUpdate.password
             };
             await updateUser(updatedStudent);
             setStudents(prev => prev.map(s => s.id === editingStudentId ? updatedStudent : s));
          }
      } else {
          // Create Mode
          // Check for duplicate ID in current list
          const idExists = students.some(s => s.id === newStudent.id);
          if (idExists) {
              alert(`Student ID "${newStudent.id}" already exists in your class list.`);
              return;
          }

          const student: User & { password?: string } = {
            id: newStudent.id, 
            name: newStudent.name,
            email: newStudent.email,
            password: newStudent.password,
            role: UserRole.STUDENT,
            teacherIds: [currentUser.id], // Assign to self
            createdAt: Date.now(),
            cie: { cie1: 0, cie2: 0, assignment: 0, assignmentSubmitted: false }
          };

          await saveUser(student);
          setStudents(prev => {
              const updated = [...prev, student];
              setTodayStats(curr => ({ ...curr, total: updated.length }));
              return updated;
          });
      }

      closeStudentModal();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openEditModal = (student: User) => {
      setNewStudent({
          id: student.id,
          name: student.name,
          email: student.email,
          password: '' // Clear password field so user focuses on name/email. Empty means "keep current".
      });
      setEditingStudentId(student.id);
      setShowStudentModal(true);
  };

  const openAddModal = () => {
      setNewStudent({ id: '', name: '', email: '', password: '' });
      setEditingStudentId(null);
      setShowStudentModal(true);
  };

  const closeStudentModal = () => {
      setShowStudentModal(false);
      setEditingStudentId(null);
      setNewStudent({ id: '', name: '', email: '', password: '' });
  };

  const handleDeleteClick = async (studentId: string) => {
      if(window.confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
          try {
              await deleteUser(studentId);
              setStudents(prev => {
                  const updated = prev.filter(s => s.id !== studentId);
                  setTodayStats(curr => ({ ...curr, total: updated.length }));
                  return updated;
              });
          } catch(err: any) {
              alert("Failed to delete student: " + err.message);
          }
      }
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Update CIE Marks Logic
  const handleMarkChange = (studentId: string, field: 'cie1' | 'cie2' | 'assignment', value: string) => {
      const numValue = Math.max(0, parseInt(value) || 0);
      
      // Validation Check against Max config
      let maxVal = 100;
      if (field === 'cie1') maxVal = marksConfig.maxCie1;
      if (field === 'cie2') maxVal = marksConfig.maxCie2;
      if (field === 'assignment') maxVal = marksConfig.maxAssignment;

      const finalValue = Math.min(numValue, maxVal);

      setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
              return {
                  ...s,
                  cie: {
                      ...s.cie,
                      [field]: finalValue
                  }
              };
          }
          return s;
      }));
  };

  const toggleAssignmentSubmit = (studentId: string) => {
      setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
              return {
                  ...s,
                  cie: {
                      ...s.cie,
                      assignmentSubmitted: !s.cie?.assignmentSubmitted
                  }
              };
          }
          return s;
      }));
  };

  const handleSaveMarks = async (student: User) => {
      try {
          await updateUser(student);
          // Optional: Show a subtle success indicator (toast)
      } catch (err: any) {
          alert('Failed to save marks: ' + err.message);
      }
  };

  const resolveErrorMessage = (err: any, studentName: string) => {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
          return { message: "Network Error: Unable to connect to the server.", type: 'network' as const };
      }
      if (msg.toLowerCase().includes('already marked')) {
          return { message: `Duplicate: ${studentName} is already marked for ${selectedSubject}.`, type: 'data' as const };
      }
      return { message: msg || "An unexpected error occurred.", type: 'data' as const };
  };

  const handleScan = async (data: string) => {
    setIsScanning(false);
    const student = students.find(s => s.id === data);
    
    if (student) {
      try {
        const now = new Date();
        const record: AttendanceRecord = {
          id: `att-${Date.now()}`,
          studentId: student.id,
          studentName: student.name,
          teacherId: currentUser.id,
          subject: selectedSubject,
          timestamp: now.getTime(),
          date: now.toISOString().split('T')[0],
          status: AttendanceStatus.PRESENT
        };
        
        await markAttendance(record);
        setScanResult({ 
          status: 'success', 
          message: `Marked present: ${student.name}`,
          source: 'scan'
        });
        
        // Update Stats
        setTodayStats(prev => ({ ...prev, present: prev.present + 1 }));

      } catch (err: any) {
        const errorDetails = resolveErrorMessage(err, student.name);
        setScanResult({ status: 'error', message: errorDetails.message, type: errorDetails.type, source: 'scan' });
      }
    } else {
      setScanResult({ status: 'error', message: 'Student not found in your class list.', type: 'data', source: 'scan' });
    }
  };

  const handleManualSubmit = async (status: AttendanceStatus) => {
    if (!manualStudentId) {
      setScanResult({ 
          status: 'error', message: 'Selection Required.', type: 'data', source: 'manual'
      });
      return;
    }
    const student = students.find(s => s.id === manualStudentId);
    if (!student) {
        setScanResult({ status: 'error', message: 'Student not found.', type: 'data', source: 'manual' });
        return;
    }

    try {
      const dateTimeString = `${manualDate}T${manualTime}`;
      const timestamp = new Date(dateTimeString).getTime();

      const record: AttendanceRecord = {
        id: `att-manual-${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        teacherId: currentUser.id,
        subject: selectedSubject,
        timestamp: timestamp,
        date: manualDate,
        status: status
      };
      
      await markAttendance(record);
      setScanResult({ 
        status: 'success', message: `Marked ${student.name} as ${status}.`, source: 'manual'
      });
      setManualStudentId(''); 
      
      // Update Stats if date is today
      const today = new Date().toISOString().split('T')[0];
      if (manualDate === today) {
          setTodayStats(prev => ({
              ...prev,
              present: status === AttendanceStatus.PRESENT ? prev.present + 1 : prev.present,
              absent: status === AttendanceStatus.ABSENT ? prev.absent + 1 : prev.absent
          }));
      }

    } catch (err: any) {
      const errorDetails = resolveErrorMessage(err, student.name);
      setScanResult({ status: 'error', message: errorDetails.message, type: errorDetails.type, source: 'manual' });
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const data = await getAttendanceReport({
        startDate: reportFilters.startDate || undefined,
        endDate: reportFilters.endDate || undefined,
        subject: reportFilters.subject === 'All' ? undefined : reportFilters.subject
      });
      
      // Filter for students belonging to this teacher to ensure privacy/relevance
      const myStudentIds = students.map(s => s.id);
      const filtered = data.filter(r => myStudentIds.includes(r.studentId) || r.teacherId === currentUser.id);
      
      filtered.sort((a,b) => b.timestamp - a.timestamp);
      setReportResults(filtered);
    } catch (err) {
      console.error(err);
      alert("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadStudentListPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Student Marks Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Teacher: ${currentUser.name}`, 14, 35);
    doc.text(`Configuration: CIE 1 (Max ${marksConfig.maxCie1}), CIE 2 (Max ${marksConfig.maxCie2}), Assignment (Max ${marksConfig.maxAssignment})`, 14, 40);

    const tableData = filteredStudents.map(s => [
      s.name,
      s.id,
      s.email,
      s.cie?.cie1 || 0,
      s.cie?.cie2 || 0,
      s.cie?.assignment || 0,
      s.cie?.assignmentSubmitted ? 'Submitted' : 'Pending'
    ]);

    autoTable(doc, {
      head: [['Name', 'ID', 'Email', 'CIE 1', 'CIE 2', 'Asgn', 'Status']],
      body: tableData,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    doc.save(`student_marks_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const downloadAttendancePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Attendance Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${reportFilters.startDate} to ${reportFilters.endDate}`, 14, 30);
    doc.text(`Subject: ${reportFilters.subject}`, 14, 35);

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
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Notices Logic
  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files: File[] = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB
      const currentTotalSize = attachments.reduce((sum, f) => sum + f.size, 0);
      let newTotalSize = currentTotalSize;
      
      const newAttachments: NoticeAttachment[] = [];

      for (const file of files) {
          if (file.type !== 'application/pdf') {
              alert(`Skipped "${file.name}": Only PDF files are allowed.`);
              continue;
          }
          if (newTotalSize + file.size > MAX_TOTAL_SIZE) {
              alert(`Cannot add "${file.name}": Total attachment size limit (5MB) exceeded.`);
              break;
          }
          
          try {
              newTotalSize += file.size;
              const base64 = await toBase64(file);
              newAttachments.push({
                  name: file.name,
                  data: base64,
                  size: file.size
              });
          } catch (err) {
              console.error('Error reading file', err);
              alert('Error reading file: ' + file.name);
          }
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (indexToRemove: number) => {
      setAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleEditNotice = (notice: Notice) => {
      setEditingNoticeId(notice.id);
      setNewNotice({ title: notice.title, content: notice.content });
      setAttachments(notice.attachments || []);
      // Scroll to form if needed
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelNoticeEdit = () => {
      setEditingNoticeId(null);
      setNewNotice({ title: '', content: '' });
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePostNotice = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newNotice.title || !newNotice.content) {
          alert('Title and Content are required');
          return;
      }
      
      setPostingNotice(true);
      try {
          if (editingNoticeId) {
             const originalNotice = notices.find(n => n.id === editingNoticeId);
             const noticeData: Notice = {
                 id: editingNoticeId,
                 teacherId: currentUser.id,
                 teacherName: currentUser.name,
                 title: newNotice.title,
                 content: newNotice.content,
                 timestamp: originalNotice?.timestamp || Date.now(),
                 attachments: attachments
             };
             await updateNotice(noticeData);
             setNotices(prev => prev.map(n => n.id === editingNoticeId ? noticeData : n));
             alert('Notice updated successfully!');
             cancelNoticeEdit();
          } else {
             const noticeData: Notice = {
                 id: `notice-${Date.now()}`,
                 teacherId: currentUser.id,
                 teacherName: currentUser.name,
                 title: newNotice.title,
                 content: newNotice.content,
                 timestamp: Date.now(),
                 attachments: attachments
             };
             
             await createNotice(noticeData);
             setNotices(prev => [noticeData, ...prev]);
             setNewNotice({ title: '', content: '' });
             setAttachments([]);
             if (fileInputRef.current) fileInputRef.current.value = '';
             alert('Notice posted successfully!');
          }
      } catch (err: any) {
          alert(err.message || 'Failed to save notice');
      } finally {
          setPostingNotice(false);
      }
  };

  const handleDeleteNotice = async (id: string) => {
      if(window.confirm('Are you sure you want to delete this notice?')) {
          try {
              await deleteNotice(id);
              setNotices(prev => prev.filter(n => n.id !== id));
          } catch (err) {
              console.error(err);
          }
      }
  };

  // Sort Handler
  const handleSort = (key: 'name' | 'cie1' | 'cie2' | 'assignment') => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  // Filter Logic with Sorting
  const filteredStudents = useMemo(() => {
    let result = [...students]; // Copy array

    // Search Filter
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter(s => 
        (s.name?.toLowerCase() || '').includes(term) ||
        (s.email?.toLowerCase() || '').includes(term) ||
        (s.id?.toLowerCase() || '').includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
        let valA: any;
        let valB: any;

        switch(sortConfig.key) {
            case 'cie1': 
                valA = a.cie?.cie1 || 0;
                valB = b.cie?.cie1 || 0;
                break;
            case 'cie2':
                valA = a.cie?.cie2 || 0;
                valB = b.cie?.cie2 || 0;
                break;
            case 'assignment':
                valA = a.cie?.assignment || 0;
                valB = b.cie?.assignment || 0;
                break;
            case 'name':
            default:
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return result;
  }, [students, searchTerm, sortConfig]);

  // Shared Summary Card Component
  const SummaryCard = () => (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center w-full sm:w-auto">
            <div className="bg-indigo-100 p-3 rounded-full mr-4 flex-shrink-0">
                <PieChart className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900">Today's Overview</h3>
                <p className="text-sm text-gray-500">
                    {selectedSubject} • {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
            </div>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none bg-green-50 border border-green-100 p-3 rounded-xl text-center min-w-[100px]">
                <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Present</p>
                <p className="text-2xl font-extrabold text-green-700 leading-none">
                    {todayStats.present} <span className="text-sm font-medium text-green-400/80">/ {todayStats.total}</span>
                </p>
            </div>
            <div className="flex-1 sm:flex-none bg-red-50 border border-red-100 p-3 rounded-xl text-center min-w-[100px]">
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">Absent</p>
                <p className="text-2xl font-extrabold text-red-700 leading-none">
                    {todayStats.absent} <span className="text-sm font-medium text-red-400/80">/ {todayStats.total}</span>
                </p>
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Mobile-friendly Tabs */}
      <div className="flex p-1 space-x-1 bg-gray-100/80 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 min-w-[100px] px-3 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm whitespace-nowrap ${
            activeTab === 'students' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
          }`}
        >
          My Students
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 min-w-[100px] px-3 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm whitespace-nowrap ${
            activeTab === 'attendance' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
          }`}
        >
          Mark Attendance
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`flex-1 min-w-[100px] px-3 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm whitespace-nowrap ${
            activeTab === 'notices' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
          }`}
        >
          Classroom
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 min-w-[100px] px-3 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm whitespace-nowrap ${
            activeTab === 'reports' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
          }`}
        >
          Reports
        </button>
      </div>

      {activeTab === 'students' && (
        <div className="space-y-6">
          <SummaryCard />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <FileSpreadsheet className="h-6 w-6 mr-2 text-indigo-600" />
                Class List & CIE Marks
              </h2>
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  <Button variant="secondary" onClick={() => setShowMarksConfig(!showMarksConfig)} className="flex-1 sm:flex-none bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Marks
                  </Button>
                  <Button onClick={downloadStudentListPDF} variant="secondary" className="flex-1 sm:flex-none bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                      <FileText className="h-4 w-4 mr-2" />
                      Export Marks PDF
                  </Button>
                  <Button onClick={openAddModal} className="flex-1 sm:flex-none">
                      <Plus className="h-4 w-4 mr-2" />
                      Enroll Student
                  </Button>
              </div>
            </div>

            {/* Marks Configuration Panel */}
            {showMarksConfig && (
                <div className="mb-6 bg-orange-50 border border-orange-100 rounded-xl p-4 animate-fade-in">
                    <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Set Maximum Marks (Configuration)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-orange-700 mb-1">Max CIE 1 Marks</label>
                            <input 
                                type="number" 
                                value={marksConfig.maxCie1}
                                onChange={(e) => setMarksConfig({...marksConfig, maxCie1: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-black font-semibold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-orange-700 mb-1">Max CIE 2 Marks</label>
                            <input 
                                type="number" 
                                value={marksConfig.maxCie2}
                                onChange={(e) => setMarksConfig({...marksConfig, maxCie2: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-black font-semibold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-orange-700 mb-1">Max Assignment Marks</label>
                            <input 
                                type="number" 
                                value={marksConfig.maxAssignment}
                                onChange={(e) => setMarksConfig({...marksConfig, maxAssignment: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm text-black font-semibold"
                            />
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-orange-600">
                        * Input fields in the table below will limit values to these maximums automatically.
                    </div>
                </div>
            )}

            {/* Add/Edit Student Modal */}
            {showStudentModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-fade-in">
                  <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transform transition-all scale-100">
                      <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center">
                              <UserPlus className="h-5 w-5 mr-2 text-indigo-600" />
                              {editingStudentId ? 'Edit Student Details' : 'Enroll New Student'}
                          </h3>
                          <button onClick={closeStudentModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                              <CloseIcon className="h-5 w-5" />
                          </button>
                      </div>
                      <form onSubmit={handleSaveStudent} className="p-6">
                          <div className="space-y-4">
                              <Input
                                  label="Student ID / Roll No"
                                  value={newStudent.id}
                                  onChange={e => setNewStudent({ ...newStudent, id: e.target.value })}
                                  placeholder="e.g. STU123"
                                  disabled={!!editingStudentId} // Disable ID edit
                                  autoFocus
                              />
                              <Input
                                  label="Full Name"
                                  value={newStudent.name}
                                  onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                  placeholder="John Doe"
                              />
                              <Input
                                  label="Email Address"
                                  type="email"
                                  value={newStudent.email}
                                  onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                                  placeholder="john@school.com"
                              />
                              <div>
                                  <Input
                                      label="Password"
                                      type="text"
                                      value={newStudent.password}
                                      onChange={e => setNewStudent({ ...newStudent, password: e.target.value })}
                                      placeholder={editingStudentId ? "Leave blank to keep current" : "********"}
                                      className="mb-1"
                                  />
                                  {editingStudentId && <p className="text-xs text-gray-400 mt-1 ml-1">Optional: Leave blank to keep current password.</p>}
                              </div>
                          </div>
                          <div className="mt-8 flex gap-3">
                              <Button type="button" variant="secondary" fullWidth onClick={closeStudentModal} className="py-3">
                                  Cancel
                              </Button>
                              <Button type="submit" fullWidth className="py-3 flex items-center justify-center">
                                  <Save className="h-4 w-4 mr-2" />
                                  {editingStudentId ? 'Update Student' : 'Save Student'}
                              </Button>
                          </div>
                      </form>
                  </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                      type="text"
                      className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition duration-150 ease-in-out"
                      placeholder="Search students by name, email, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                      <button 
                          onClick={() => setSearchTerm('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                          title="Clear Search"
                      >
                          <X className="h-5 w-5" />
                      </button>
                  )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-8"><Loader className="animate-spin text-indigo-600" /></div>
            ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                        scope="col" 
                        className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        onClick={() => handleSort('name')}
                    >
                        <div className="flex items-center">
                            Student
                            {sortConfig.key === 'name' ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-600" /> : <ArrowDown className="h-3 w-3 ml-1 text-indigo-600" />
                            ) : (
                                <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div>
                    </th>
                    <th 
                        scope="col" 
                        className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        onClick={() => handleSort('cie1')}
                    >
                        <div className="flex items-center justify-center">
                            CIE 1 <span className="text-gray-400 text-[10px] ml-1">/{marksConfig.maxCie1}</span>
                            {sortConfig.key === 'cie1' ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-600" /> : <ArrowDown className="h-3 w-3 ml-1 text-indigo-600" />
                            ) : (
                                <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div>
                    </th>
                    <th 
                        scope="col" 
                        className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        onClick={() => handleSort('cie2')}
                    >
                        <div className="flex items-center justify-center">
                            CIE 2 <span className="text-gray-400 text-[10px] ml-1">/{marksConfig.maxCie2}</span>
                            {sortConfig.key === 'cie2' ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-600" /> : <ArrowDown className="h-3 w-3 ml-1 text-indigo-600" />
                            ) : (
                                <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div>
                    </th>
                    <th 
                        scope="col" 
                        className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors group"
                        onClick={() => handleSort('assignment')}
                    >
                        <div className="flex items-center justify-center">
                            Assignment <span className="text-gray-400 text-[10px] ml-1">/{marksConfig.maxAssignment}</span>
                            {sortConfig.key === 'assignment' ? (
                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-indigo-600" /> : <ArrowDown className="h-3 w-3 ml-1 text-indigo-600" />
                            ) : (
                                <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{student.id.split('-')[1] || student.id}</div>
                        </td>
                        
                        {/* CIE 1 */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input
                              type="number"
                              min="0"
                              max={marksConfig.maxCie1}
                              className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-center text-black bg-white"
                              value={student.cie?.cie1?.toString() || '0'}
                              onChange={(e) => handleMarkChange(student.id, 'cie1', e.target.value)}
                              onBlur={() => handleSaveMarks(student)}
                            />
                        </td>

                        {/* CIE 2 */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                            <input
                              type="number"
                              min="0"
                              max={marksConfig.maxCie2}
                              className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-center text-black bg-white"
                              value={student.cie?.cie2?.toString() || '0'}
                              onChange={(e) => handleMarkChange(student.id, 'cie2', e.target.value)}
                              onBlur={() => handleSaveMarks(student)}
                            />
                        </td>

                        {/* Assignment */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-4">
                            <div className="flex flex-col items-center">
                                <input
                                    type="number"
                                    min="0"
                                    max={marksConfig.maxAssignment}
                                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-center text-black bg-white mb-1"
                                    value={student.cie?.assignment?.toString() || '0'}
                                    onChange={(e) => handleMarkChange(student.id, 'assignment', e.target.value)}
                                    onBlur={() => handleSaveMarks(student)}
                                />
                                <span className="text-[10px] text-gray-400">Marks</span>
                            </div>

                            <div className="flex flex-col items-center">
                                <button 
                                    onClick={() => {
                                        const newValue = !student.cie?.assignmentSubmitted;
                                        toggleAssignmentSubmit(student.id);
                                        handleSaveMarks({...student, cie: {...student.cie, assignmentSubmitted: newValue}});
                                    }}
                                    className={`
                                        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2
                                        ${student.cie?.assignmentSubmitted ? 'bg-green-500' : 'bg-gray-200'}
                                    `}
                                    role="switch"
                                    aria-checked={student.cie?.assignmentSubmitted}
                                    title={student.cie?.assignmentSubmitted ? "Mark as Pending" : "Mark as Submitted"}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`
                                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                                            ${student.cie?.assignmentSubmitted ? 'translate-x-5' : 'translate-x-0'}
                                        `}
                                    />
                                </button>
                                <span className={`text-[10px] font-medium mt-1 ${student.cie?.assignmentSubmitted ? 'text-green-600' : 'text-gray-400'}`}>
                                    {student.cie?.assignmentSubmitted ? 'Submitted' : 'Pending'}
                                </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedStudentQR(student)}
                              className="text-indigo-600 hover:text-indigo-900 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View QR"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(student)}
                              className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Details"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(student.id)}
                              className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Student"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <SummaryCard />
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
            <div className="max-w-xl mx-auto space-y-8">
              <div className="bg-gradient-to-br from-indigo-50 to-white p-6 sm:p-8 rounded-3xl border border-indigo-100 text-center shadow-sm">
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-indigo-900 mb-2">Start Session</h2>
                  <p className="text-indigo-600/80 text-sm">Select a subject and method to begin.</p>
                </div>
                
                <div className="max-w-xs mx-auto mb-8 text-left">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Current Subject</label>
                  <div className="relative">
                      <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold text-gray-900 shadow-sm appearance-none"
                      >
                      {availableSubjects.map(s => (
                          <option key={s} value={s}>{s}</option>
                      ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-indigo-500">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button 
                      onClick={() => { 
                          setScanResult(null); 
                          setIsScanning(true); 
                          setShowManualAttendance(false);
                      }}
                      className="flex items-center justify-center py-4 px-6 text-lg shadow-indigo-500/20 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                      <Scan className="h-6 w-6 mr-3" />
                      Launch QR Scanner
                  </Button>
                  <Button 
                      variant="secondary"
                      onClick={() => {
                          setScanResult(null);
                          setShowManualAttendance(!showManualAttendance);
                      }}
                      className="flex items-center justify-center py-4 px-6 text-base border-gray-200 hover:bg-gray-50"
                  >
                      <ClipboardList className="h-5 w-5 mr-3 text-gray-500" />
                      {showManualAttendance ? 'Hide Manual Entry' : 'Manual Entry'}
                  </Button>
                </div>
              </div>

              {showManualAttendance && (
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xl animate-fade-in ring-4 ring-gray-50">
                      <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">Manual Entry</h3>
                      <div className="space-y-5">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Student</label>
                              <select
                                  value={manualStudentId}
                                  onChange={(e) => setManualStudentId(e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50"
                              >
                                  <option value="">-- Choose Student --</option>
                                  {students.map(s => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                              </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                                  <div className="relative">
                                      <input
                                          type="date"
                                          max={new Date().toISOString().split('T')[0]}
                                          value={manualDate}
                                          onChange={(e) => setManualDate(e.target.value)}
                                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50 text-sm"
                                      />
                                      <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Time</label>
                                  <div className="relative">
                                      <input
                                          type="time"
                                          value={manualTime}
                                          onChange={(e) => setManualTime(e.target.value)}
                                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50 text-sm"
                                      />
                                      <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                              <Button 
                                  onClick={() => handleManualSubmit(AttendanceStatus.PRESENT)}
                                  className="bg-green-600 hover:bg-green-700 py-3 flex items-center justify-center font-bold"
                              >
                                  <CheckCircle className="h-5 w-5 mr-2" />
                                  Mark Present
                              </Button>
                              <Button 
                                  onClick={() => handleManualSubmit(AttendanceStatus.ABSENT)}
                                  variant="danger"
                                  className="py-3 flex items-center justify-center font-bold"
                              >
                                  <XCircle className="h-5 w-5 mr-2" />
                                  Mark Absent
                              </Button>
                          </div>
                      </div>
                  </div>
              )}
              
              {/* Result Modal - Full Screen Mobile, Card Desktop */}
              {scanResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm animate-fade-in">
                  <div className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100 ring-1 ring-white/20`}>
                    
                    <div className={`h-2 w-full ${scanResult.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />

                    <div className="p-8 text-center">
                      <div className="mb-6 flex justify-center">
                          {scanResult.status === 'success' ? (
                          <div className="relative">
                              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                              <div className="relative bg-green-50 rounded-full p-4 border border-green-100">
                                  <CheckCircle className="h-12 w-12 text-green-600" />
                              </div>
                          </div>
                          ) : (
                          <div className="bg-red-50 rounded-full p-4 border border-red-100">
                              {scanResult.type === 'network' ? <WifiOff className="h-12 w-12 text-red-600" /> : <AlertCircle className="h-12 w-12 text-red-600" />}
                          </div>
                          )}
                      </div>

                      <h3 className={`text-xl font-extrabold mb-2 ${scanResult.status === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                        {scanResult.status === 'success' ? 'Success!' : 'Oops!'}
                      </h3>
                      
                      <p className="text-gray-600 mb-8 text-base font-medium leading-relaxed">
                        {scanResult.message}
                      </p>

                      <div className="space-y-3">
                        <Button 
                          onClick={() => {
                            setScanResult(null);
                            if (scanResult.status === 'success') {
                              if (scanResult.source === 'scan') {
                                  setIsScanning(true);
                              }
                            }
                          }}
                          fullWidth
                          className="py-3.5 text-base shadow-lg"
                        >
                          {scanResult.status === 'success' 
                              ? (scanResult.source === 'manual' ? 'Mark Another' : 'Scan Next') 
                              : 'Try Again'}
                        </Button>
                        
                        <Button 
                          variant="secondary"
                          onClick={() => setScanResult(null)}
                          fullWidth
                          className="py-3 text-base border-transparent bg-gray-50 text-gray-500 hover:text-gray-700"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notices' && (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-indigo-600" />
                      {editingNoticeId ? 'Edit Notice' : 'Post New Notice / Material'}
                  </h2>
                  <form onSubmit={handlePostNotice} className="space-y-4">
                      <Input
                          label="Title"
                          placeholder="Notice Title or Topic Name"
                          value={newNotice.title}
                          onChange={e => setNewNotice({...newNotice, title: e.target.value})}
                      />
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Message / Details</label>
                          <textarea 
                              className="w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px]"
                              placeholder="Enter details..."
                              value={newNotice.content}
                              onChange={e => setNewNotice({...newNotice, content: e.target.value})}
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Attach PDF Notes (Optional, Max 5MB Total)</label>
                          <div className="space-y-3">
                              <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-all w-full group">
                                  <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                                        <Upload className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-sm font-medium text-gray-700">Click to upload files</span>
                                        <span className="block text-xs text-gray-500">PDF only (Multiple allowed)</span>
                                    </div>
                                  </div>
                                  <input 
                                      type="file" 
                                      ref={fileInputRef}
                                      accept="application/pdf"
                                      onChange={handleFileChange}
                                      multiple
                                      className="hidden"
                                  />
                              </label>

                              {attachments.length > 0 && (
                                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                                      {attachments.map((file, index) => (
                                          <div key={index} className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 group">
                                              <div className="flex items-center min-w-0">
                                                  <FileIcon className="h-4 w-4 text-indigo-600 mr-2 flex-shrink-0" />
                                                  <div className="min-w-0">
                                                      <p className="text-sm text-indigo-900 font-medium truncate">{file.name}</p>
                                                      <p className="text-xs text-indigo-500">{(file.size / 1024).toFixed(1)} KB</p>
                                                  </div>
                                              </div>
                                              <button 
                                                  type="button" 
                                                  onClick={() => removeAttachment(index)}
                                                  className="ml-2 p-1 text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                  title="Remove file"
                                              >
                                                  <X className="h-4 w-4" />
                                              </button>
                                          </div>
                                      ))}
                                      <div className="sm:col-span-2 text-right">
                                          <span className="text-xs font-medium text-gray-500">
                                              Total Size: {(attachments.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB / 5.00 MB
                                          </span>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="flex justify-end pt-2 gap-3">
                          {editingNoticeId && (
                              <Button type="button" variant="secondary" onClick={cancelNoticeEdit} className="py-2.5 px-6">
                                  Cancel
                              </Button>
                          )}
                          <Button type="submit" disabled={postingNotice} className="py-2.5 px-6 shadow-md">
                             {postingNotice ? <div className="flex items-center"><Loader className="animate-spin h-5 w-5 mr-2" /> {editingNoticeId ? 'Updating...' : 'Posting...'}</div> : (editingNoticeId ? 'Update Notice' : 'Post Notice')}
                          </Button>
                      </div>
                  </form>
              </div>

              <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 pl-1">Recent Posts</h3>
                  {notices.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-500">
                          <MessageSquare className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                          <p>No notices posted yet.</p>
                      </div>
                  ) : (
                      notices.map(notice => (
                          <div key={notice.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all relative group">
                              <div className="absolute top-4 right-4 flex gap-2">
                                  <button 
                                      onClick={() => handleEditNotice(notice)}
                                      className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                                      title="Edit Notice"
                                  >
                                      <Pencil className="h-4 w-4" />
                                  </button>
                                  <button 
                                      onClick={() => handleDeleteNotice(notice.id)}
                                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                      title="Delete Notice"
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </button>
                              </div>
                              <div className="mb-2 pr-16">
                                  <h4 className="text-lg font-bold text-gray-900">{notice.title}</h4>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notice.timestamp).toLocaleString()}
                                    {editingNoticeId === notice.id && <span className="ml-2 text-indigo-500 font-medium">(Editing...)</span>}
                                  </p>
                              </div>
                              <p className="text-gray-600 text-sm whitespace-pre-wrap mb-4">{notice.content}</p>
                              
                              {notice.attachments && notice.attachments.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-gray-50">
                                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Attached Files</p>
                                      <div className="flex flex-wrap gap-2">
                                          {notice.attachments.map((file, idx) => (
                                              <a 
                                                  key={idx}
                                                  href={file.data} 
                                                  download={file.name} 
                                                  className="flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-100 group/file"
                                              >
                                                  <FileIcon className="h-4 w-4 mr-2 text-indigo-500 group-hover/file:text-indigo-700" />
                                                  <span className="truncate max-w-[150px]">{file.name}</span>
                                                  <Download className="h-3 w-3 ml-2 opacity-50" />
                                              </a>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {/* QR Scanner Component */}
      <QRScanner 
        isScanning={isScanning} 
        onScan={handleScan} 
        onClose={() => setIsScanning(false)} 
      />

      {/* View Student QR Modal */}
      {selectedStudentQR && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedStudentQR(null)}>
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl transform scale-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-1 text-gray-900">{selectedStudentQR.name}</h3>
            <p className="text-gray-400 mb-6 text-sm font-mono tracking-wide">{selectedStudentQR.id}</p>
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 inline-block mb-6">
                <QRCode value={selectedStudentQR.id} size={220} />
            </div>
            <div>
                <Button onClick={() => setSelectedStudentQR(null)} fullWidth className="py-3 rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};