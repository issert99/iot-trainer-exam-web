export type ExamUserRole = 'admin' | 'student' | 'teacher';
export type ExamUserStatus = 'active' | 'inactive' | 'locked';

export type AdminUserRow = {
  id: string;
  lastLogin: string;
  org: string;
  realName: string;
  role: ExamUserRole;
  status: ExamUserStatus;
  username: string;
};

export type AdminClassCard = {
  id: string;
  name: string;
  studentCount: number;
  teacherName: string;
};

export const MOCK_USERS: AdminUserRow[] = [
  {
    id: 'u1',
    realName: '张同学',
    username: '20240001',
    role: 'student',
    org: '物联2401',
    lastLogin: '今天 09:12',
    status: 'active',
  },
  {
    id: 'u2',
    realName: '王老师',
    username: 'T2024001',
    role: 'teacher',
    org: '信息工程学院',
    lastLogin: '昨天 16:40',
    status: 'active',
  },
  {
    id: 'u3',
    realName: '赵同学',
    username: '20240018',
    role: 'student',
    org: '物联2402',
    lastLogin: '3 天前',
    status: 'inactive',
  },
  {
    id: 'u4',
    realName: '李老师',
    username: 'T2024012',
    role: 'teacher',
    org: '自动化学院',
    lastLogin: '今天 11:05',
    status: 'active',
  },
  {
    id: 'u5',
    realName: '陈同学',
    username: '20240056',
    role: 'student',
    org: '物联2401',
    lastLogin: '今天 08:21',
    status: 'active',
  },
  {
    id: 'u6',
    realName: '系统管理员',
    username: 'admin',
    role: 'admin',
    org: '教务处',
    lastLogin: '今天 10:02',
    status: 'active',
  },
  {
    id: 'u7',
    realName: '刘同学',
    username: '20240077',
    role: 'student',
    org: '软件2403',
    lastLogin: '5 天前',
    status: 'locked',
  },
  {
    id: 'u8',
    realName: '周老师',
    username: 'T2024033',
    role: 'teacher',
    org: '信息工程学院',
    lastLogin: '昨天 09:18',
    status: 'active',
  },
  {
    id: 'u9',
    realName: '孙同学',
    username: '20240102',
    role: 'student',
    org: '物联2402',
    lastLogin: '今天 14:33',
    status: 'active',
  },
  {
    id: 'u10',
    realName: '吴同学',
    username: '20240119',
    role: 'student',
    org: '软件2403',
    lastLogin: '2 天前',
    status: 'active',
  },
  {
    id: 'u11',
    realName: '郑老师',
    username: 'T2024055',
    role: 'teacher',
    org: '自动化学院',
    lastLogin: '今天 07:55',
    status: 'inactive',
  },
  {
    id: 'u12',
    realName: '钱同学',
    username: '20240130',
    role: 'student',
    org: '物联2401',
    lastLogin: '今天 13:10',
    status: 'active',
  },
];

export const MOCK_CLASSES: AdminClassCard[] = [
  { id: 'c1', name: '物联2401', studentCount: 45, teacherName: '王老师' },
  { id: 'c2', name: '物联2402', studentCount: 42, teacherName: '李老师' },
  { id: 'c3', name: '软件2403', studentCount: 48, teacherName: '周老师' },
  { id: 'c4', name: '自动化2401', studentCount: 40, teacherName: '郑老师' },
];

export const USER_STATS = {
  activeToday: 342,
  students: 1203,
  teachers: 78,
  total: 1286,
};

export const ROLE_LABEL: Record<ExamUserRole, string> = {
  admin: '管理',
  student: '学生',
  teacher: '教师',
};

export const STATUS_LABEL: Record<ExamUserStatus, string> = {
  active: '正常',
  inactive: '已禁用',
  locked: '已锁定',
};
