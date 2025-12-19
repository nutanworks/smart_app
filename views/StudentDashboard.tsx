import React, { useMemo, useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { User, AttendanceRecord, AttendanceStatus, Notice } from '../types';
import { getStudentAttendance, getNotices } from '../services/storage';
import { Calendar, CheckCircle, Clock, XCircle, Filter, ArrowUpDown, Loader, Circle, FileText, Download, MessageSquare, File, PieChart, TrendingUp, AlertTriangle, BookOpen, CheckSquare, Square } from 'lucide-react';
import { Button } from '../components/Button';

interface StudentDashboardProps {
  currentUser: User;
}

type FilterStatus = 'ALL' | 'PRESENT' | 'ABSENT';
type SortKey = 'date' | 'subject';
type SortDirection = 'asc' | 'desc';

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'notices' | 'marks'>('attendance');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Notices State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [sortConfig, setSortConfig] = useState<{key: SortKey, direction: SortDirection}>({ 
    key: 'date', 
    direction: 'desc' 
  });

  useEffect(() => {
    const fetchHistory = async () => {
        try {
            const data = await getStudentAttendance(currentUser.id);
            setRecords(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    fetchHistory();
  }, [currentUser.id]);

  useEffect(() => {
      if (activeTab === 'notices') {
          const fetchNotices = async () => {
              setLoadingNotices(true);
              try {
                  const data = await getNotices({ studentId: currentUser.id });
                  setNotices(data);
              } catch (err) {
                  console.error(err);
              } finally {
                  setLoadingNotices(false);
              }
          };
          fetchNotices();
      }
  }, [activeTab, currentUser.id]);

  // Calculate stats based on ALL records
  const totalClasses = records.length;
  const totalPresent = records.filter(r => r.status === AttendanceStatus.PRESENT || !r.status).length;
  const totalAbsent = records.filter(r => r.status === AttendanceStatus.ABSENT).length;
  
  // Percentage Calculation
  const attendancePercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

  // Determine Color based on Percentage
  const getPercentageColor = (pct: number) => {
      if (pct >= 75) return 'text-emerald-600';
      if (pct >= 60) return 'text-amber-500';
      return 'text-red-600';
  };
  
  const getPercentageBg = (pct: number) => {
      if (pct >= 75) return 'bg-emerald-50 border-emerald-100';
      if (pct >= 60) return 'bg-amber-50 border-amber-100';
      return 'bg-red-50 border-red-100';
  };

  const processedData = useMemo(() => {
    let filtered = records;

    // 1. Filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(r => {
        const status = r.status || AttendanceStatus.PRESENT; 
        return filterStatus === 'PRESENT' 
          ? status === AttendanceStatus.PRESENT 
          : status === AttendanceStatus.ABSENT;
      });
    }

    // 2. Group & Sort
    const groups: { [key: string]: AttendanceRecord[] } = {};

    if (sortConfig.key === 'date') {
      filtered.forEach(r => {
        if (!groups[r.date]) groups[r.date] = [];
        groups[r.date].push(r);
      });

      const sortedKeys = Object.keys(groups).sort((a, b) => {
        const timeA = new Date(a).getTime();
        const timeB = new Date(b).getTime();
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA;
      });

      return sortedKeys.map(date => ({
        title: new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        type: 'date',
        items: groups[date].sort((a, b) => b.timestamp - a.timestamp) 
      }));

    } else {
      filtered.forEach(r => {
        if (!groups[r.subject]) groups[r.subject] = [];
        groups[r.subject].push(r);
      });

      const sortedKeys = Object.keys(groups).sort((a, b) => {
        return sortConfig.direction === 'asc' 
          ? a.localeCompare(b) 
          : b.localeCompare(a);
      });

      return sortedKeys.map(subject => ({
        title: subject,
        type: 'subject',
        items: groups[subject].sort((a, b) => b.timestamp - a.timestamp) 
      }));
    }
  }, [records, filterStatus, sortConfig]);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
             <Loader className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Sidebar / Personal Info - Responsive Layout */}
      <div className="lg:col-span-1 space-y-4 lg:space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex lg:flex-col items-center gap-4 lg:gap-0">
              <div className="w-16 h-16 lg:w-24 lg:h-24 bg-indigo-100 rounded-full flex items-center justify-center lg:mx-auto lg:mb-4 text-xl lg:text-2xl font-bold text-indigo-700 shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="lg:text-center min-w-0 flex-1">
                  <h2 className="text-lg lg:text-xl font-bold text-gray-900 truncate">{currentUser.name}</h2>
                  <p className="text-sm text-gray-500 truncate">{currentUser.email}</p>
              </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 hidden lg:block">
             <div className="bg-white p-3 rounded-lg border border-gray-200 inline-block shadow-sm w-full flex justify-center">
                <QRCode value={currentUser.id} size={140} className="h-auto max-w-full" />
             </div>
             <p className="text-xs text-center text-gray-400 mt-2">Your Unique Attendance QR</p>
          </div>
        </div>

        {/* Overall Percentage Card */}
        <div className={`rounded-2xl shadow-sm p-6 border ${getPercentageBg(attendancePercentage)}`}>
           <div className="flex justify-between items-start mb-2">
               <div>
                   <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">Overall Attendance</h3>
                   <p className="text-xs text-gray-500 mt-1">Based on {totalClasses} conducted sessions</p>
               </div>
               <PieChart className={`h-6 w-6 ${getPercentageColor(attendancePercentage)}`} />
           </div>
           <div className="mt-4 flex items-end">
               <span className={`text-5xl font-extrabold ${getPercentageColor(attendancePercentage)}`}>{attendancePercentage}%</span>
               {attendancePercentage < 75 && (
                   <span className="mb-2 ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold uppercase rounded-full flex items-center">
                       <AlertTriangle className="h-3 w-3 mr-1" /> Low
                   </span>
               )}
           </div>
           <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
               <div 
                  className={`h-2.5 rounded-full ${attendancePercentage >= 75 ? 'bg-emerald-500' : attendancePercentage >= 60 ? 'bg-amber-400' : 'bg-red-500'}`} 
                  style={{ width: `${attendancePercentage}%` }}
               ></div>
           </div>
        </div>

        {/* Desktop Stats Grid */}
        <div className="hidden lg:grid grid-cols-2 gap-4">
          <div className="bg-emerald-600 rounded-2xl shadow-sm p-4 text-white text-center hover:bg-emerald-700 transition-colors">
            <h3 className="text-xs font-bold uppercase opacity-80 mb-1">Present</h3>
            <p className="text-3xl font-extrabold">{totalPresent}</p>
          </div>
          <div className="bg-red-500 rounded-2xl shadow-sm p-4 text-white text-center hover:bg-red-600 transition-colors">
            <h3 className="text-xs font-bold uppercase opacity-80 mb-1">Absent</h3>
            <p className="text-3xl font-extrabold">{totalAbsent}</p>
          </div>
        </div>

        {/* Mobile Accordion for QR Code */}
        <div className="lg:hidden bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col items-center">
             <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your ID Code</p>
             <QRCode value={currentUser.id} size={100} />
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex p-1 space-x-1 bg-gray-100/80 rounded-xl overflow-x-auto">
            <button
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 min-w-[100px] px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm flex items-center justify-center ${
                activeTab === 'attendance' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
                }`}
            >
                <Calendar className="h-4 w-4 mr-2" />
                History
            </button>
            <button
                onClick={() => setActiveTab('marks')}
                className={`flex-1 min-w-[100px] px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm flex items-center justify-center ${
                activeTab === 'marks' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
                }`}
            >
                <BookOpen className="h-4 w-4 mr-2" />
                Marks
            </button>
            <button
                onClick={() => setActiveTab('notices')}
                className={`flex-1 min-w-[100px] px-4 py-2.5 text-sm font-medium rounded-lg transition-all shadow-sm flex items-center justify-center ${
                activeTab === 'notices' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-none'
                }`}
            >
                <MessageSquare className="h-4 w-4 mr-2" />
                Classroom
            </button>
        </div>

        {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                History
                </h2>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{records.length} Records</span>
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select 
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer text-gray-700 font-medium"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                >
                  <option value="ALL">All Status</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                </select>
                <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative flex-1">
                 <select 
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer text-gray-700 font-medium"
                  value={`${sortConfig.key}-${sortConfig.direction}`}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split('-');
                    setSortConfig({ key: key as SortKey, direction: direction as SortDirection });
                  }}
                >
                  <option value="date-desc">Newest</option>
                  <option value="date-asc">Oldest</option>
                  <option value="subject-asc">Subject (A-Z)</option>
                </select>
                <ArrowUpDown className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {processedData.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-64">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <Filter className="h-8 w-8 text-gray-400" />
                </div>
                <p>No records found.</p>
                {(filterStatus !== 'ALL') && (
                    <Button 
                        variant="secondary" 
                        className="mt-4" 
                        onClick={() => { setFilterStatus('ALL'); }}
                    >
                        Clear Filters
                    </Button>
                )}
              </div>
            ) : (
              processedData.map((group) => (
                <div key={group.title} className="p-4 sm:p-6 bg-white hover:bg-gray-50/50 transition-colors">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mr-2"></div>
                    {group.title}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.items.map(record => {
                      const isAbsent = record.status === AttendanceStatus.ABSENT;
                      return (
                        <div key={record.id} className={`flex items-center justify-between p-4 border border-l-4 rounded-xl shadow-sm transition-all hover:shadow-md ${isAbsent ? 'bg-red-50 border-red-100 border-l-red-500' : 'bg-white border-gray-200 border-l-emerald-500'}`}>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${isAbsent ? 'bg-white border-2 border-red-100 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                              {isAbsent ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-bold truncate ${isAbsent ? 'text-red-900' : 'text-gray-900'}`}>
                                  {sortConfig.key === 'subject' 
                                      ? new Date(record.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})
                                      : record.subject
                                  }
                              </p>
                              <p className={`text-xs flex items-center mt-0.5 ${isAbsent ? 'text-red-600/70' : 'text-gray-500'}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide ml-2 ${isAbsent ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            <span className={`w-2 h-2 rounded-full ${isAbsent ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {isAbsent ? 'Absent' : 'Present'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        {activeTab === 'marks' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-fade-in">
                 <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <BookOpen className="h-6 w-6 mr-2 text-indigo-600" />
                            Internal Assessment
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">CIE Scores and Assignment Status</p>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                    </div>
                 </div>

                 <div className="grid gap-6 md:grid-cols-3">
                     {/* CIE 1 Card */}
                     <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">CIE 1 Score</h3>
                         <div className="relative flex items-center justify-center">
                             <div className="text-5xl font-extrabold text-gray-900">{currentUser.cie?.cie1 || 0}</div>
                         </div>
                         <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                             <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(((currentUser.cie?.cie1 || 0) / 20) * 100, 100)}%` }}></div>
                         </div>
                     </div>

                     {/* CIE 2 Card */}
                     <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">CIE 2 Score</h3>
                         <div className="relative flex items-center justify-center">
                             <div className="text-5xl font-extrabold text-gray-900">{currentUser.cie?.cie2 || 0}</div>
                         </div>
                         <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                             <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(((currentUser.cie?.cie2 || 0) / 20) * 100, 100)}%` }}></div>
                         </div>
                     </div>

                     {/* Assignment Card */}
                     <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Assignment</h3>
                         <div className="flex items-center gap-3 mb-2">
                             <div className="text-5xl font-extrabold text-gray-900">{currentUser.cie?.assignment || 0}</div>
                             <div className="text-left">
                                 <span className="block text-xs text-gray-400">Marks</span>
                                 <span className="block text-xs font-bold text-gray-600">Obtained</span>
                             </div>
                         </div>
                         
                         <div className={`mt-4 px-4 py-2 rounded-xl flex items-center text-sm font-bold border ${currentUser.cie?.assignmentSubmitted ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                             {currentUser.cie?.assignmentSubmitted ? (
                                 <>
                                    <CheckSquare className="h-4 w-4 mr-2" /> Submitted
                                 </>
                             ) : (
                                 <>
                                    <Square className="h-4 w-4 mr-2" /> Pending
                                 </>
                             )}
                         </div>
                     </div>
                 </div>

                 <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
                    <h4 className="font-bold text-gray-800 mb-2">Performance Summary</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        You have currently secured a total of <span className="font-bold text-indigo-600">{(currentUser.cie?.cie1 || 0) + (currentUser.cie?.cie2 || 0) + (currentUser.cie?.assignment || 0)}</span> marks 
                        in your internal assessments. Ensure all assignments are submitted on time to maximize your final grade.
                    </p>
                 </div>
             </div>
        )}

        {activeTab === 'notices' && (
            <div className="space-y-6">
                {loadingNotices ? (
                    <div className="flex justify-center p-12"><Loader className="animate-spin text-indigo-600 h-8 w-8" /></div>
                ) : (
                    <>
                        {notices.length === 0 ? (
                            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500">
                                <MessageSquare className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                                <p>No notices have been posted by your teachers yet.</p>
                            </div>
                        ) : (
                            notices.map(notice => (
                                <div key={notice.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900">{notice.title}</h4>
                                            <p className="text-xs font-semibold text-indigo-600 mt-1">Posted by: {notice.teacherName}</p>
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(notice.timestamp).toLocaleDateString()}</span>
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
                                                        <File className="h-4 w-4 mr-2 text-indigo-500 group-hover/file:text-indigo-700" />
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
                    </>
                )}
            </div>
        )}

      </div>
    </div>
  );
};