export type CollegeRow = {
  code: string;
  id: string;
  isActive: boolean;
  majorCount: number;
  name: string;
  shortName: string;
};

export type MajorRow = {
  classCount: number;
  code: string;
  collegeId: string;
  collegeName: string;
  courseCount: number;
  id: string;
  isActive: boolean;
  name: string;
  shortName: string;
};

export type CourseRow = {
  checked?: boolean;
  code: string;
  collegeName: string;
  courseNature: 'elective' | 'required';
  credit: number;
  examType: 'assessment' | 'exam';
  id: string;
  isActive: boolean;
  majorId: string;
  majorName: string;
  name: string;
  offeringDepartment: string;
  practiceHours: number;
  suggestTerm: string;
  textbook: string;
  theoryHours: number;
  totalHours: number;
};

export type AdminClassRow = {
  checked?: boolean;
  collegeName: string;
  grade: string;
  headTeacherName: string;
  id: string;
  majorId: string;
  majorName: string;
  name: string;
  studentCount: number;
};

export type TeacherRow = {
  checked?: boolean;
  collegeId: string;
  collegeName: string;
  degree: '博士' | '学士' | '硕士';
  education: '博士' | '本科' | '硕士';
  email: string;
  graduateSchool: string;
  hireDate: string;
  householdLocation: string;
  id: string;
  idCardNo: string;
  majorIds: string[];
  name: string;
  phone: string;
  status: 'active' | 'inactive';
  title: string;
  username: string;
};

export type StudentRow = {
  checked?: boolean;
  classId: string;
  className: string;
  collegeId: string;
  collegeName: string;
  email: string;
  emergencyContact: string;
  emergencyPhone: string;
  gaokaoScore: number;
  grade: string;
  graduateSchool: string;
  householdAddress: string;
  householdLocation: string;
  id: string;
  idCardNo: string;
  majorId: string;
  majorName: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive' | 'locked';
  username: string;
};

export type OfferingTeacher = {
  id: string;
  name: string;
  role: 'assistant' | 'instructor';
};

export type OfferingRow = {
  classNames: string[];
  courseCode: string;
  courseName: string;
  id: string;
  majorName: string;
  name: string;
  semester: string;
  status: 'active' | 'cancelled' | 'closed';
  studentCount: number;
  teachers: OfferingTeacher[];
};

export const MOCK_COLLEGES: CollegeRow[] = [
  {
    id: 'col-sie',
    code: 'SIE',
    name: '信息工程学院',
    shortName: '信工',
    majorCount: 2,
    isActive: true,
  },
  {
    id: 'col-sfl',
    code: 'SFL',
    name: '外国语学院',
    shortName: '外语',
    majorCount: 1,
    isActive: true,
  },
  {
    id: 'col-sci',
    code: 'SCI',
    name: '理学院',
    shortName: '理学院',
    majorCount: 1,
    isActive: true,
  },
  {
    id: 'col-med',
    code: 'MED',
    name: '医学院',
    shortName: '医学院',
    majorCount: 1,
    isActive: true,
  },
  {
    id: 'col-art',
    code: 'ART',
    name: '艺术学院',
    shortName: '艺术',
    majorCount: 1,
    isActive: true,
  },
];

export const MOCK_MAJORS: MajorRow[] = [
  {
    id: 'maj-iot',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    code: 'IOT',
    name: '物联网工程',
    shortName: '物联网',
    classCount: 2,
    courseCount: 3,
    isActive: true,
  },
  {
    id: 'maj-cs',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    code: 'CS',
    name: '计算机科学',
    shortName: '计算机',
    classCount: 2,
    courseCount: 2,
    isActive: true,
  },
  {
    id: 'maj-eng',
    collegeId: 'col-sfl',
    collegeName: '外国语学院',
    code: 'ENG',
    name: '英语/外语',
    shortName: '外语',
    classCount: 0,
    courseCount: 0,
    isActive: true,
  },
  {
    id: 'maj-math',
    collegeId: 'col-sci',
    collegeName: '理学院',
    code: 'MATH',
    name: '数学/物理',
    shortName: '数理',
    classCount: 0,
    courseCount: 0,
    isActive: true,
  },
  {
    id: 'maj-nurs',
    collegeId: 'col-med',
    collegeName: '医学院',
    code: 'NURS',
    name: '医学/护理',
    shortName: '医学',
    classCount: 0,
    courseCount: 0,
    isActive: true,
  },
  {
    id: 'maj-des',
    collegeId: 'col-art',
    collegeName: '艺术学院',
    code: 'DES',
    name: '艺术/设计',
    shortName: '艺术',
    classCount: 0,
    courseCount: 0,
    isActive: true,
  },
];

export const MOCK_COURSES: CourseRow[] = [
  {
    id: 'cou-iot101',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeName: '信息工程学院',
    code: 'IOT101',
    name: '物联网导论',
    credit: 3,
    suggestTerm: '第1学期',
    totalHours: 48,
    theoryHours: 32,
    practiceHours: 16,
    examType: 'assessment',
    courseNature: 'required',
    offeringDepartment: '信息工程学院',
    textbook: '物联网技术与应用（第3版）',
    isActive: true,
  },
  {
    id: 'cou-iot201',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeName: '信息工程学院',
    code: 'IOT201',
    name: '传感器与检测',
    credit: 3.5,
    suggestTerm: '第3学期',
    totalHours: 56,
    theoryHours: 28,
    practiceHours: 28,
    examType: 'exam',
    courseNature: 'required',
    offeringDepartment: '信息工程学院',
    textbook: '现代传感器技术',
    isActive: true,
  },
  {
    id: 'cou-iot301',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeName: '信息工程学院',
    code: 'IOT301',
    name: '嵌入式系统',
    credit: 4,
    suggestTerm: '第5学期',
    totalHours: 64,
    theoryHours: 30,
    practiceHours: 34,
    examType: 'exam',
    courseNature: 'required',
    offeringDepartment: '信息工程学院',
    textbook: 'ARM嵌入式开发实战',
    isActive: true,
  },
  {
    id: 'cou-cs101',
    majorId: 'maj-cs',
    majorName: '计算机科学',
    collegeName: '信息工程学院',
    code: 'CS101',
    name: '程序设计基础',
    credit: 4,
    suggestTerm: '第1学期',
    totalHours: 64,
    theoryHours: 32,
    practiceHours: 32,
    examType: 'exam',
    courseNature: 'required',
    offeringDepartment: '信息工程学院',
    textbook: 'C语言程序设计',
    isActive: true,
  },
  {
    id: 'cou-cs201',
    majorId: 'maj-cs',
    majorName: '计算机科学',
    collegeName: '信息工程学院',
    code: 'CS201',
    name: '数据结构',
    credit: 3.5,
    suggestTerm: '第3学期',
    totalHours: 56,
    theoryHours: 34,
    practiceHours: 22,
    examType: 'exam',
    courseNature: 'required',
    offeringDepartment: '信息工程学院',
    textbook: '数据结构（严蔚敏）',
    isActive: true,
  },
];

export const MOCK_ADMIN_CLASSES: AdminClassRow[] = [
  {
    id: 'c1',
    name: '物联2401',
    grade: '2024',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeName: '信息工程学院',
    studentCount: 45,
    headTeacherName: '王老师',
  },
  {
    id: 'c2',
    name: '物联2402',
    grade: '2024',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeName: '信息工程学院',
    studentCount: 42,
    headTeacherName: '李老师',
  },
  {
    id: 'c3',
    name: '计科2401',
    grade: '2024',
    majorId: 'maj-cs',
    majorName: '计算机科学',
    collegeName: '信息工程学院',
    studentCount: 48,
    headTeacherName: '周老师',
  },
  {
    id: 'c4',
    name: '计科2301',
    grade: '2023',
    majorId: 'maj-cs',
    majorName: '计算机科学',
    collegeName: '信息工程学院',
    studentCount: 40,
    headTeacherName: '郑老师',
  },
];

export const MOCK_TEACHERS: TeacherRow[] = [
  {
    id: 't1',
    name: '王老师',
    username: 'T2024001',
    idCardNo: '430522198701151238',
    phone: '13811110001',
    email: 'wang.teacher@univ.edu.cn',
    education: '硕士',
    degree: '硕士',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    majorIds: ['maj-iot'],
    householdLocation: '湖南省邵阳市',
    graduateSchool: '中南大学',
    hireDate: '2015-09-01',
    title: '讲师',
    status: 'active',
  },
  {
    id: 't2',
    name: '李老师',
    username: 'T2024012',
    idCardNo: '420102198512093119',
    phone: '13811110012',
    email: 'li.teacher@univ.edu.cn',
    education: '博士',
    degree: '博士',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    majorIds: ['maj-iot'],
    householdLocation: '湖北省武汉市',
    graduateSchool: '华中科技大学',
    hireDate: '2012-03-15',
    title: '副教授',
    status: 'active',
  },
  {
    id: 't3',
    name: '周老师',
    username: 'T2024033',
    idCardNo: '330106199004028812',
    phone: '13811110033',
    email: 'zhou.teacher@univ.edu.cn',
    education: '硕士',
    degree: '硕士',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    majorIds: ['maj-cs'],
    householdLocation: '浙江省杭州市',
    graduateSchool: '浙江大学',
    hireDate: '2018-07-01',
    title: '讲师',
    status: 'active',
  },
  {
    id: 't4',
    name: '郑老师',
    username: 'T2024055',
    idCardNo: '510108199305214514',
    phone: '13811110055',
    email: 'zheng.teacher@univ.edu.cn',
    education: '本科',
    degree: '学士',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    majorIds: ['maj-cs'],
    householdLocation: '四川省成都市',
    graduateSchool: '电子科技大学',
    hireDate: '2022-02-20',
    title: '助教',
    status: 'inactive',
  },
];

export const MOCK_STUDENTS: StudentRow[] = [
  {
    id: 's1',
    name: '张同学',
    username: '20240001',
    idCardNo: '430302200607018737',
    phone: '13900000001',
    email: '20240001@stu.edu.cn',
    classId: 'c1',
    className: '物联2401',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    grade: '2024',
    householdLocation: '湖南省株洲市',
    householdAddress: '湖南省株洲市天元区XX路18号',
    graduateSchool: '株洲市第一中学',
    gaokaoScore: 586,
    emergencyContact: '张父',
    emergencyPhone: '13700000001',
    status: 'active',
  },
  {
    id: 's2',
    name: '赵同学',
    username: '20240018',
    idCardNo: '430502200603155126',
    phone: '13900000018',
    email: '20240018@stu.edu.cn',
    classId: 'c2',
    className: '物联2402',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    grade: '2024',
    householdLocation: '湖南省邵阳市',
    householdAddress: '湖南省邵阳市双清区XX路66号',
    graduateSchool: '邵阳市第二中学',
    gaokaoScore: 571,
    emergencyContact: '赵母',
    emergencyPhone: '13700000018',
    status: 'inactive',
  },
  {
    id: 's3',
    name: '陈同学',
    username: '20240056',
    idCardNo: '440106200606219218',
    phone: '13900000056',
    email: '20240056@stu.edu.cn',
    classId: 'c1',
    className: '物联2401',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    grade: '2024',
    householdLocation: '广东省广州市',
    householdAddress: '广东省广州市天河区XX大道8号',
    graduateSchool: '广州市第七中学',
    gaokaoScore: 603,
    emergencyContact: '陈父',
    emergencyPhone: '13700000056',
    status: 'active',
  },
  {
    id: 's4',
    name: '孙同学',
    username: '20240102',
    idCardNo: '320103200605302717',
    phone: '13900000102',
    email: '20240102@stu.edu.cn',
    classId: 'c2',
    className: '物联2402',
    majorId: 'maj-iot',
    majorName: '物联网工程',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    grade: '2024',
    householdLocation: '江苏省南京市',
    householdAddress: '江苏省南京市玄武区XX街10号',
    graduateSchool: '南京市金陵中学',
    gaokaoScore: 592,
    emergencyContact: '孙母',
    emergencyPhone: '13700000102',
    status: 'active',
  },
  {
    id: 's5',
    name: '吴同学',
    username: '20240119',
    idCardNo: '370102200604120539',
    phone: '13900000119',
    email: '20240119@stu.edu.cn',
    classId: 'c3',
    className: '计科2401',
    majorId: 'maj-cs',
    majorName: '计算机科学',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    grade: '2024',
    householdLocation: '山东省济南市',
    householdAddress: '山东省济南市历下区XX巷2号',
    graduateSchool: '济南市实验中学',
    gaokaoScore: 618,
    emergencyContact: '吴父',
    emergencyPhone: '13700000119',
    status: 'active',
  },
  {
    id: 's6',
    name: '钱同学',
    username: '20240130',
    idCardNo: '330110200509048614',
    phone: '13900000130',
    email: '20240130@stu.edu.cn',
    classId: 'c4',
    className: '计科2301',
    majorId: 'maj-cs',
    majorName: '计算机科学',
    collegeId: 'col-sie',
    collegeName: '信息工程学院',
    grade: '2023',
    householdLocation: '浙江省杭州市',
    householdAddress: '浙江省杭州市余杭区XX路11号',
    graduateSchool: '杭州市第二中学',
    gaokaoScore: 566,
    emergencyContact: '钱母',
    emergencyPhone: '13700000130',
    status: 'locked',
  },
];

export const MOCK_OFFERINGS: OfferingRow[] = [
  {
    id: 'off-1',
    name: '物联网导论 · 合班A',
    semester: '2025-2026-1',
    courseCode: 'IOT101',
    courseName: '物联网导论',
    majorName: '物联网工程',
    classNames: ['物联2401', '物联2402'],
    teachers: [
      { id: 't1', name: '王老师', role: 'instructor' },
      { id: 't2', name: '李老师', role: 'instructor' },
    ],
    studentCount: 87,
    status: 'active',
  },
  {
    id: 'off-2',
    name: '传感器与检测 · 物联2401',
    semester: '2025-2026-1',
    courseCode: 'IOT201',
    courseName: '传感器与检测',
    majorName: '物联网工程',
    classNames: ['物联2401'],
    teachers: [{ id: 't2', name: '李老师', role: 'instructor' }],
    studentCount: 45,
    status: 'active',
  },
  {
    id: 'off-3',
    name: '程序设计基础 · 合班',
    semester: '2025-2026-1',
    courseCode: 'CS101',
    courseName: '程序设计基础',
    majorName: '计算机科学',
    classNames: ['计科2401', '计科2301'],
    teachers: [
      { id: 't3', name: '周老师', role: 'instructor' },
      { id: 't4', name: '郑老师', role: 'assistant' },
    ],
    studentCount: 88,
    status: 'active',
  },
  {
    id: 'off-4',
    name: '数据结构 · 计科2301',
    semester: '2025-2026-1',
    courseCode: 'CS201',
    courseName: '数据结构',
    majorName: '计算机科学',
    classNames: ['计科2301'],
    teachers: [{ id: 't3', name: '周老师', role: 'instructor' }],
    studentCount: 40,
    status: 'closed',
  },
];

export const TEACHER_ROLE_LABEL: Record<OfferingTeacher['role'], string> = {
  assistant: '助教',
  instructor: '主讲',
};

export const OFFERING_STATUS_LABEL: Record<OfferingRow['status'], string> = {
  active: '开课中',
  cancelled: '已取消',
  closed: '已结课',
};
