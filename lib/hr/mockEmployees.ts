export interface Document {
  id: string;
  name: string;
  type: "id" | "contract" | "certification" | "training" | "reference" | "other";
  size: string;
  uploadedDate: string;
  url?: string;
}

export interface Verification {
  id: string;
  name: string;
  status: "complete" | "pending" | "missing";
  completedDate?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone: string;
  dob?: string;
  ssn?: string; // Masked for display
  gender?: string;
  avatar?: string;
  role: "caregiver" | "cna" | "hha" | "lpn" | "rn" | "admin" | "coordinator" | "other";
  status: "active" | "inactive" | "onboarding";
  startDate: string;
  department: string;
  supervisor: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
  };
  payRate: number;
  payType: "hourly" | "salary" | "per-visit";
  bankAccount?: string;
  routingNumber?: string;
  bankName?: string;
  workAuthorization?: string;
  notes?: string;
  skills?: string[];
  isArchived?: boolean;
  registeredAt?: string;
  lastActiveAt?: string;
  documents: Document[];
  verifications: Verification[];
}

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    firstName: "Sarah",
    lastName: "Anderson",
    email: "sarah.anderson@nessacrm.com",
    phone: "(555) 123-4501",
    role: "rn",
    status: "active",
    startDate: "2023-01-15",
    department: "Skilled Nursing",
    supervisor: "Jane Smith",
    address: {
      street: "456 Maple Street",
      city: "Portland",
      state: "OR",
      zip: "97201",
    },
    emergencyContact: {
      name: "Michael Anderson",
      phone: "(555) 123-4502",
    },
    payRate: 45.0,
    payType: "hourly",
    ssn: "***-**-4567",
    dob: "1985-03-22",
    workAuthorization: "U.S. Citizen",
    notes: "Lead RN for complex care cases. Excellent wound care skills.",
    skills: ["Wound Care", "IV Therapy", "Care Planning", "BLS"],
    documents: [
      {
        id: "doc-1",
        name: "RN License",
        type: "certification",
        size: "1.2 MB",
        uploadedDate: "2023-01-10",
      },
      {
        id: "doc-2",
        name: "CPR Certification",
        type: "training",
        size: "800 KB",
        uploadedDate: "2023-01-10",
      },
    ],
    verifications: [
      { id: "v1", name: "Background Check", status: "complete", completedDate: "2023-01-12" },
      { id: "v2", name: "Reference 1 Verified", status: "complete", completedDate: "2023-01-13" },
      { id: "v3", name: "Reference 2 Verified", status: "complete", completedDate: "2023-01-13" },
      { id: "v4", name: "I-9 Form", status: "complete", completedDate: "2023-01-14" },
      { id: "v5", name: "HIPAA Training", status: "complete", completedDate: "2023-01-15" },
    ],
  },
  {
    id: "emp-2",
    firstName: "Marcus",
    lastName: "Thompson",
    email: "marcus.thompson@nessacrm.com",
    phone: "(555) 234-5602",
    role: "caregiver",
    status: "active",
    startDate: "2023-06-01",
    department: "Home Care",
    supervisor: "Jane Smith",
    address: {
      street: "789 Oak Avenue",
      city: "Seattle",
      state: "WA",
      zip: "98101",
    },
    emergencyContact: {
      name: "Lisa Thompson",
      phone: "(555) 234-5603",
    },
    payRate: 22.5,
    payType: "hourly",
    ssn: "***-**-7890",
    dob: "1992-07-14",
    workAuthorization: "U.S. Citizen",
    notes: "Specializes in dementia care. Very patient and compassionate.",
    skills: ["Dementia Care", "First Aid", "Mobility Assistance"],
    documents: [
      {
        id: "doc-3",
        name: "Drivers License",
        type: "id",
        size: "500 KB",
        uploadedDate: "2023-05-28",
      },
      {
        id: "doc-4",
        name: "First Aid Certificate",
        type: "training",
        size: "650 KB",
        uploadedDate: "2023-05-28",
      },
    ],
    verifications: [
      { id: "v6", name: "Background Check", status: "complete", completedDate: "2023-05-30" },
      { id: "v7", name: "Reference 1 Verified", status: "complete", completedDate: "2023-05-30" },
      { id: "v8", name: "Reference 2 Verified", status: "complete", completedDate: "2023-05-31" },
      { id: "v9", name: "I-9 Form", status: "complete", completedDate: "2023-06-01" },
      { id: "v10", name: "HIPAA Training", status: "complete", completedDate: "2023-06-01" },
    ],
  },
  {
    id: "emp-3",
    firstName: "Jennifer",
    lastName: "Lee",
    email: "jennifer.lee@nessacrm.com",
    phone: "(555) 345-6703",
    role: "lpn",
    status: "active",
    startDate: "2022-11-10",
    department: "Skilled Nursing",
    supervisor: "Jane Smith",
    address: {
      street: "234 Pine Lane",
      city: "Denver",
      state: "CO",
      zip: "80202",
    },
    emergencyContact: {
      name: "David Lee",
      phone: "(555) 345-6704",
    },
    payRate: 32.0,
    payType: "hourly",
    ssn: "***-**-2345",
    dob: "1988-11-05",
    workAuthorization: "U.S. Citizen",
    notes: "Experienced in post-surgical care and medication management.",
    documents: [
      {
        id: "doc-5",
        name: "LPN License",
        type: "certification",
        size: "1.1 MB",
        uploadedDate: "2022-11-05",
      },
      {
        id: "doc-6",
        name: "OSHA Training",
        type: "training",
        size: "720 KB",
        uploadedDate: "2022-11-05",
      },
    ],
    verifications: [
      { id: "v11", name: "Background Check", status: "complete", completedDate: "2022-11-08" },
      { id: "v12", name: "Reference 1 Verified", status: "complete", completedDate: "2022-11-08" },
      { id: "v13", name: "Reference 2 Verified", status: "complete", completedDate: "2022-11-09" },
      { id: "v14", name: "I-9 Form", status: "complete", completedDate: "2022-11-10" },
      { id: "v15", name: "HIPAA Training", status: "complete", completedDate: "2022-11-10" },
    ],
  },
  {
    id: "emp-4",
    firstName: "Robert",
    lastName: "Garcia",
    email: "robert.garcia@nessacrm.com",
    phone: "(555) 456-7804",
    role: "cna",
    status: "onboarding",
    startDate: "2024-01-22",
    department: "Home Care",
    supervisor: "Jane Smith",
    address: {
      street: "567 Birch Road",
      city: "Austin",
      state: "TX",
      zip: "78701",
    },
    emergencyContact: {
      name: "Maria Garcia",
      phone: "(555) 456-7805",
    },
    payRate: 19.5,
    payType: "hourly",
    ssn: "***-**-6789",
    dob: "1995-04-18",
    workAuthorization: "Work Visa",
    notes: "Currently completing onboarding training.",
    documents: [
      {
        id: "doc-7",
        name: "CNA Certificate",
        type: "certification",
        size: "980 KB",
        uploadedDate: "2024-01-18",
      },
    ],
    verifications: [
      { id: "v16", name: "Background Check", status: "pending" },
      { id: "v17", name: "Reference 1 Verified", status: "complete", completedDate: "2024-01-20" },
      { id: "v18", name: "Reference 2 Verified", status: "pending" },
      { id: "v19", name: "I-9 Form", status: "complete", completedDate: "2024-01-22" },
      { id: "v20", name: "HIPAA Training", status: "pending" },
    ],
  },
  {
    id: "emp-5",
    firstName: "Emily",
    lastName: "Rodriguez",
    email: "emily.rodriguez@nessacrm.com",
    phone: "(555) 567-8905",
    role: "coordinator",
    status: "active",
    startDate: "2021-03-15",
    department: "Operations",
    supervisor: "David Wilson",
    address: {
      street: "890 Cedar Court",
      city: "Raleigh",
      state: "NC",
      zip: "27601",
    },
    emergencyContact: {
      name: "Carlos Rodriguez",
      phone: "(555) 567-8906",
    },
    payRate: 55000,
    payType: "salary",
    ssn: "***-**-3456",
    dob: "1987-09-30",
    workAuthorization: "U.S. Citizen",
    notes: "Care Coordinator with 8+ years experience. Excellent client relations.",
    documents: [
      {
        id: "doc-8",
        name: "Employment Contract",
        type: "contract",
        size: "2.1 MB",
        uploadedDate: "2021-03-10",
      },
      {
        id: "doc-9",
        name: "NDA Agreement",
        type: "contract",
        size: "800 KB",
        uploadedDate: "2021-03-10",
      },
    ],
    verifications: [
      { id: "v21", name: "Background Check", status: "complete", completedDate: "2021-03-12" },
      { id: "v22", name: "Reference 1 Verified", status: "complete", completedDate: "2021-03-12" },
      { id: "v23", name: "Reference 2 Verified", status: "complete", completedDate: "2021-03-13" },
      { id: "v24", name: "I-9 Form", status: "complete", completedDate: "2021-03-14" },
      { id: "v25", name: "HIPAA Training", status: "complete", completedDate: "2021-03-15" },
    ],
  },
  {
    id: "emp-6",
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.brown@nessacrm.com",
    phone: "(555) 678-9006",
    role: "hha",
    status: "active",
    startDate: "2023-08-20",
    department: "Home Care",
    supervisor: "Jane Smith",
    address: {
      street: "123 Willow Way",
      city: "Atlanta",
      state: "GA",
      zip: "30301",
    },
    emergencyContact: {
      name: "Susan Brown",
      phone: "(555) 678-9007",
    },
    payRate: 20.0,
    payType: "hourly",
    ssn: "***-**-8901",
    dob: "1990-12-08",
    workAuthorization: "U.S. Citizen",
    notes: "Reliable and punctual. Strong in personal care assistance.",
    documents: [
      {
        id: "doc-10",
        name: "HHA Certificate",
        type: "certification",
        size: "1.0 MB",
        uploadedDate: "2023-08-15",
      },
      {
        id: "doc-11",
        name: "TB Test Results",
        type: "other",
        size: "400 KB",
        uploadedDate: "2023-08-15",
      },
    ],
    verifications: [
      { id: "v26", name: "Background Check", status: "complete", completedDate: "2023-08-18" },
      { id: "v27", name: "Reference 1 Verified", status: "complete", completedDate: "2023-08-18" },
      { id: "v28", name: "Reference 2 Verified", status: "complete", completedDate: "2023-08-19" },
      { id: "v29", name: "I-9 Form", status: "complete", completedDate: "2023-08-20" },
      { id: "v30", name: "HIPAA Training", status: "complete", completedDate: "2023-08-20" },
    ],
  },
  {
    id: "emp-7",
    firstName: "Amanda",
    lastName: "Wilson",
    email: "amanda.wilson@nessacrm.com",
    phone: "(555) 789-0107",
    role: "admin",
    status: "active",
    startDate: "2022-05-01",
    department: "Administration",
    supervisor: "David Wilson",
    address: {
      street: "456 Spruce Drive",
      city: "Portland",
      state: "OR",
      zip: "97202",
    },
    emergencyContact: {
      name: "John Wilson",
      phone: "(555) 789-0108",
    },
    payRate: 48000,
    payType: "salary",
    ssn: "***-**-4567",
    dob: "1993-06-25",
    workAuthorization: "U.S. Citizen",
    notes: "Administrative Assistant handling HR and scheduling.",
    documents: [
      {
        id: "doc-12",
        name: "Employment Agreement",
        type: "contract",
        size: "1.8 MB",
        uploadedDate: "2022-04-25",
      },
    ],
    verifications: [
      { id: "v31", name: "Background Check", status: "complete", completedDate: "2022-04-28" },
      { id: "v32", name: "Reference 1 Verified", status: "complete", completedDate: "2022-04-28" },
      { id: "v33", name: "Reference 2 Verified", status: "complete", completedDate: "2022-04-29" },
      { id: "v34", name: "I-9 Form", status: "complete", completedDate: "2022-05-01" },
      { id: "v35", name: "HIPAA Training", status: "complete", completedDate: "2022-05-01" },
    ],
  },
  {
    id: "emp-8",
    firstName: "Daniel",
    lastName: "Martinez",
    email: "daniel.martinez@nessacrm.com",
    phone: "(555) 890-1208",
    role: "caregiver",
    status: "inactive",
    startDate: "2020-02-10",
    department: "Home Care",
    supervisor: "Jane Smith",
    address: {
      street: "789 Elm Street",
      city: "Seattle",
      state: "WA",
      zip: "98102",
    },
    emergencyContact: {
      name: "Patricia Martinez",
      phone: "(555) 890-1209",
    },
    payRate: 21.0,
    payType: "hourly",
    ssn: "***-**-5678",
    dob: "1986-02-14",
    workAuthorization: "U.S. Citizen",
    notes: "On leave of absence. Expected return date: March 2024.",
    documents: [
      {
        id: "doc-13",
        name: "Leave of Absence Form",
        type: "other",
        size: "600 KB",
        uploadedDate: "2023-12-15",
      },
    ],
    verifications: [
      { id: "v36", name: "Background Check", status: "complete", completedDate: "2020-02-08" },
      { id: "v37", name: "Reference 1 Verified", status: "complete", completedDate: "2020-02-08" },
      { id: "v38", name: "Reference 2 Verified", status: "complete", completedDate: "2020-02-09" },
      { id: "v39", name: "I-9 Form", status: "complete", completedDate: "2020-02-10" },
      { id: "v40", name: "HIPAA Training", status: "complete", completedDate: "2020-02-10" },
    ],
  },
];
