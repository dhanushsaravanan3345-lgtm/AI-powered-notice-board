const bcrypt = require('bcryptjs');

const salt = bcrypt.genSaltSync(10);
exports.salt = salt;

const defaultCategories = [
  {
    id: "cat-exam",
    name: "Examinations",
    description: "Semester schedules, hall tickets, revaluation, and autonomous exam circulars",
    color: "#ef4444",
    icon: "bi-calendar-check"
  },
  {
    id: "cat-acad",
    name: "Academic",
    description: "Curriculum, project reviews, laboratory schedules, and department syllabus",
    color: "#3b82f6",
    icon: "bi-book"
  },
  {
    id: "cat-place",
    name: "Placements",
    description: "Campus recruitment, internships, eligibility criteria, and interview training",
    color: "#10b981",
    icon: "bi-briefcase"
  },
  {
    id: "cat-events",
    name: "Events & Symposium",
    description: "Technical symposiums, hackathons, guest lectures, and cultural fests",
    color: "#8b5cf6",
    icon: "bi-stars"
  },
  {
    id: "cat-sports",
    name: "Sports & Culture",
    description: "Inter-collegiate tournaments, trials, arts club, and music events",
    color: "#f59e0b",
    icon: "bi-trophy"
  },
  {
    id: "cat-admin",
    name: "Circulars & Admin",
    description: "College transport, hostel regulations, fee deadlines, and library notices",
    color: "#64748b",
    icon: "bi-megaphone"
  }
];

const defaultNotices = [
  {
    id: "not-001",
    title: "End Semester Autonomous Theory Examination Timetable - Nov/Dec 2026",
    content: "The Autonomous Controller of Examinations has officially released the detailed schedule for the upcoming End Semester Theory Examinations (November/December 2026). Theory examinations commence on November 18, 2026, and conclude on December 12, 2026. Hall tickets will be downloadable via the Student ERP Portal starting November 5, 2026. Hall tickets will only be generated for candidates with a minimum attendance requirement of 75%. Any discrepancies in course codes must be reported to the respective department academic coordinators before November 10, 2026. Examination sessions are split into Morning (09:30 AM to 12:30 PM) and Afternoon (01:30 PM to 04:30 PM).",
    summary: "Autonomous end semester theory exams run from Nov 18 to Dec 12, 2026. Hall tickets download opens Nov 5 on ERP for students with >=75% attendance. Report course code discrepancies by Nov 10.",
    category: "Examinations",
    priority: "Urgent",
    targetDepartments: ["All"],
    targetYears: ["All"],
    authorId: "usr-admin-01",
    authorName: "Dr. S. Ramanathan",
    authorRole: "Controller of Examinations",
    status: "Published",
    publishAt: "2026-10-01T09:00:00.000Z",
    expiresAt: "2026-12-15T23:59:59.000Z",
    isPinned: true,
    viewsCount: 342,
    attachment: {
      name: "Timetable_Autonomous_Theory_NovDec2026.pdf",
      url: "#",
      size: "2.4 MB",
      type: "application/pdf"
    },
    savedByUsers: ["usr-stud-01"]
  },
  {
    id: "not-002",
    title: "National Technical Symposium 'INNOV-AI 2026' - 24hr Hackathon & Paper Presentation",
    content: "The Department of Artificial Intelligence and Data Science proudly announces the 4th National Level Technical Symposium 'INNOV-AI 2026' on October 24 and 25, 2026. Highlights include a 24-Hour AI Agent Hackathon with cash prizes up to INR 1,50,000, Paper Presentation on LLMs, Generative AI, and Autonomous Robotics, as well as hands-on Cloud AI bootcamps. Registration is mandatory by October 18, 2026. Students from AI&DS, CSE, IT, and ECE (2nd, 3rd, and 4th Years) are eligible. Accommodation is provided for outstation teams. Free lunch and delegate kits will be distributed to registered participants.",
    summary: "Dept of AI&DS organizes INNOV-AI 2026 on Oct 24-25 featuring a 24hr Hackathon and Paper Presentation with ₹1.5L prizes. Registration closes Oct 18, 2026. Open to AI&DS, CSE, IT, and ECE (Years 2-4).",
    category: "Events & Symposium",
    priority: "High",
    targetDepartments: ["Artificial Intelligence & Data Science", "Computer Science & Engineering", "Information Technology", "Electronics & Communication Engineering"],
    targetYears: ["2nd Year", "3rd Year", "4th Year"],
    authorId: "usr-fac-01",
    authorName: "Prof. Priya Sundaram",
    authorRole: "HOD & Symposium Chair",
    status: "Published",
    publishAt: "2026-10-02T10:30:00.000Z",
    expiresAt: "2026-10-26T23:59:59.000Z",
    isPinned: true,
    viewsCount: 215,
    attachment: {
      name: "INNOV_AI_2026_Flyer_and_Rules.pdf",
      url: "#",
      size: "4.1 MB",
      type: "application/pdf"
    },
    savedByUsers: ["usr-stud-01", "usr-stud-02"]
  },
  {
    id: "not-003",
    title: "Campus Recruitment Drive 2026-27: Microsoft & Google Cloud Summer Internship",
    content: "The Central Training and Placement Cell invites eligible pre-final year (3rd Year) and final year (4th Year) students of AI & DS, CSE, and ECE for the upcoming Microsoft and Google Cloud Summer Internship & Full-time hiring drive. CTC offered is 16 LPA to 32 LPA, with a monthly internship stipend of INR 85,000. Eligibility criteria: CGPA 8.0 and above with no standing arrears. The online coding assessment is scheduled for October 22, 2026, at 04:00 PM in the Central Computing Labs. Resume submission on the placement portal closes on October 15, 2026, at 5:00 PM sharp.",
    summary: "Placement drive for Microsoft & Google Cloud summer internship/FT (16-32 LPA, ₹85k stipend). Eligibility: CGPA >= 8.0, 0 arrears for AI&DS, CSE, ECE (3rd & 4th years). Resume submission deadline Oct 15, 4 PM test on Oct 22.",
    category: "Placements",
    priority: "High",
    targetDepartments: ["Artificial Intelligence & Data Science", "Computer Science & Engineering", "Electronics & Communication Engineering"],
    targetYears: ["3rd Year", "4th Year"],
    authorId: "usr-fac-02",
    authorName: "Dr. K. Venkatesh",
    authorRole: "Placement Officer",
    status: "Published",
    publishAt: "2026-10-02T11:00:00.000Z",
    expiresAt: "2026-10-23T23:59:59.000Z",
    isPinned: false,
    viewsCount: 489,
    attachment: {
      name: "Google_Microsoft_Job_Description_2026.pdf",
      url: "#",
      size: "1.8 MB",
      type: "application/pdf"
    },
    savedByUsers: ["usr-stud-01", "usr-stud-03"]
  },
  {
    id: "not-004",
    title: "B.Tech AI & DS 3rd Year: Mini-Project Phase-1 Review & Abstract Submission",
    content: "All 3rd Year B.Tech Artificial Intelligence and Data Science students are hereby notified that the Phase-1 Mini-Project Review is scheduled for October 28, 2026. Each batch must comprise strictly 3 to 4 students. Project titles and one-page problem abstracts approved by your designated faculty guide must be uploaded to the department portal by October 16, 2026. The review committee will evaluate: problem novelty, dataset identification, system architecture diagram, and baseline literature review. PPT presentations must not exceed 10 slides.",
    summary: "3rd Year AI&DS Mini-Project Phase-1 Review on Oct 28, 2026. Batches of 3-4 must submit approved title and abstract by Oct 16. Evaluation covers novelty, dataset, architecture, and baseline survey.",
    category: "Academic",
    priority: "Medium",
    targetDepartments: ["Artificial Intelligence & Data Science"],
    targetYears: ["3rd Year"],
    authorId: "usr-fac-01",
    authorName: "Prof. Priya Sundaram",
    authorRole: "HOD AI & DS",
    status: "Published",
    publishAt: "2026-10-02T14:15:00.000Z",
    expiresAt: "2026-10-30T18:00:00.000Z",
    isPinned: false,
    viewsCount: 167,
    attachment: {
      name: "MiniProject_Phase1_Rubrics_Template.docx",
      url: "#",
      size: "820 KB",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    savedByUsers: ["usr-stud-01"]
  },
  {
    id: "not-005",
    title: "Central Library Clearance & Book Return Notice for Semester End",
    content: "All students are instructed to return all borrowed library books, reference manuals, and project CDs on or before November 8, 2026. Books overdue beyond this date will attract a daily fine of INR 10 per day. Students with pending books or outstanding dues will be restricted from obtaining their autonomous semester examination hall tickets. Digital renewal can be requested via the OPAC library portal until October 25, 2026.",
    summary: "Return library books by Nov 8, 2026 to avoid ₹10/day fine. Unreturned books will block examination hall ticket issuance. Online renewal allowed until Oct 25 via OPAC.",
    category: "Circulars & Admin",
    priority: "Urgent",
    targetDepartments: ["All"],
    targetYears: ["All"],
    authorId: "usr-admin-01",
    authorName: "Dr. S. Ramanathan",
    authorRole: "Chief Librarian & Admin",
    status: "Published",
    publishAt: "2026-10-03T08:00:00.000Z",
    expiresAt: "2026-11-10T23:59:59.000Z",
    isPinned: false,
    viewsCount: 198,
    attachment: null,
    savedByUsers: []
  },
  {
    id: "not-006",
    title: "Hands-on Workshop: 'Production-Ready LLMs and Autonomous Agents' by Industry Lead",
    content: "The Department of Computer Science & Engineering in association with AI&DS is conducting a 2-day intensive technical workshop on 'Production-Ready LLMs and Autonomous Agents' on October 19-20, 2026, in the Turing Auditorium. The session is led by Mr. Adithya Rao, Senior Principal AI Engineer at ThoughtWorks. Topics: Vector Databases, LangChain/LlamaIndex architectures, Agentic workflows, and Fine-tuning small open models. Certificate of participation will be issued. Registration is open to 2nd, 3rd, and 4th Year students. Nominal lab fee is INR 250.",
    summary: "2-day hands-on workshop on LLMs & Autonomous Agents on Oct 19-20 in Turing Auditorium by ThoughtWorks AI Lead. Open to 2nd, 3rd & 4th years of CSE and AI&DS. Registration fee ₹250.",
    category: "Events & Symposium",
    priority: "Medium",
    targetDepartments: ["Computer Science & Engineering", "Artificial Intelligence & Data Science"],
    targetYears: ["2nd Year", "3rd Year", "4th Year"],
    authorId: "usr-fac-02",
    authorName: "Dr. K. Venkatesh",
    authorRole: "CSE Department Coordinator",
    status: "Published",
    publishAt: "2026-10-03T09:30:00.000Z",
    expiresAt: "2026-10-21T18:00:00.000Z",
    isPinned: false,
    viewsCount: 142,
    attachment: {
      name: "LLM_Workshop_Brochure_Agenda.pdf",
      url: "#",
      size: "1.2 MB",
      type: "application/pdf"
    },
    savedByUsers: ["usr-stud-02"]
  },
  {
    id: "not-007",
    title: "Annual Inter-Departmental Sports & Athletics Tournament 'SPARK 2026'",
    content: "The Department of Physical Education invites student athletes for the selection trials for 'SPARK 2026' inter-departmental championship. Events include Cricket, Football, Basketball, Badminton, Volleyball, 100m/200m/400m Sprint, and Shot Put. Selection trials take place at the University Main Ground between October 12 and October 14, 2026, starting at 06:30 AM daily. Winners will represent the college at the State Inter-University Games. Register with your department sports representative.",
    summary: "SPARK 2026 Sports selection trials from Oct 12 to Oct 14 at 6:30 AM at University Main Ground for all departments and years. Events include team games and track athletics.",
    category: "Sports & Culture",
    priority: "Low",
    targetDepartments: ["All"],
    targetYears: ["All"],
    authorId: "usr-admin-01",
    authorName: "Dr. S. Ramanathan",
    authorRole: "Director of Physical Education",
    status: "Published",
    publishAt: "2026-10-02T16:00:00.000Z",
    expiresAt: "2026-10-15T23:59:59.000Z",
    isPinned: false,
    viewsCount: 88,
    attachment: null,
    savedByUsers: []
  },
  {
    id: "not-008",
    title: "Merit-Cum-Means & State Government Scholarship Renewal Form Submission",
    content: "Students who are beneficiaries of the State Government Post-Matric Scholarship, National Merit Scholarship, or First Generation Graduate Concession are required to submit renewal application forms along with their previous semester mark sheets and income certificates to the College Scholarship Desk (Room 104, Administrative Block) before October 29, 2026. Failure to submit documents will result in delay or rejection of scholarship disbursement.",
    summary: "Submit scholarship renewal forms with grade sheets and income certificate to Room 104, Admin Block by Oct 29, 2026. Applicable for all eligible government and merit scholars.",
    category: "Academic",
    priority: "Medium",
    targetDepartments: ["All"],
    targetYears: ["2nd Year", "3rd Year", "4th Year"],
    authorId: "usr-admin-01",
    authorName: "Dr. S. Ramanathan",
    authorRole: "Academic Office",
    status: "Published",
    publishAt: "2026-10-01T11:20:00.000Z",
    expiresAt: "2026-10-31T17:00:00.000Z",
    isPinned: false,
    viewsCount: 231,
    attachment: {
      name: "Scholarship_Renewal_Form_2026.pdf",
      url: "#",
      size: "640 KB",
      type: "application/pdf"
    },
    savedByUsers: []
  }
];

const defaultNotifications = [
  {
    id: "notif-001",
    userId: "usr-stud-01",
    noticeId: "not-001",
    title: "Urgent: Exam Timetable Released",
    message: "Autonomous End Semester Theory Examination timetable has been published. Exams begin Nov 18.",
    type: "urgent",
    isRead: false,
    createdAt: "2026-10-01T09:05:00.000Z"
  },
  {
    id: "notif-002",
    userId: "usr-stud-01",
    noticeId: "not-003",
    title: "Placement Alert: Microsoft & Google Cloud",
    message: "Summer internship drive open for 3rd & 4th Year AI&DS. Apply before Oct 15.",
    type: "high",
    isRead: false,
    createdAt: "2026-10-02T11:05:00.000Z"
  },
  {
    id: "notif-003",
    userId: "usr-stud-01",
    noticeId: "not-005",
    title: "Admin Notice: Library Due Clearance",
    message: "Return all library books before Nov 8 to avoid examination hall ticket hold.",
    type: "urgent",
    isRead: true,
    createdAt: "2026-10-03T08:05:00.000Z"
  }
];

module.exports = {
  defaultCategories,
  defaultUsers,
  defaultNotices,
  defaultNotifications
};
