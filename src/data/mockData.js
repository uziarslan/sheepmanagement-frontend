// Mock Data for Sheep Farm Management System
// This file contains dummy data that simulates backend responses

export const mockAnimals = [
  {
    id: 1,
    tagId: "SHP-001",
    electronicId: "RFID-0001",
    name: "Sheru",
    animalType: "Sheep",
    breedType: "Dumba",
    subcategory: "Fattening",
    sex: "Male",
    purchasedFrom: "Pakistan",
    arrivalDate: "2025-12-01",
    birthDate: "2024-06-15",
    purchasePrice: 45000,
    weight: 35,
    weightDate: "2025-12-01",
    penId: 1,
    status: "Active",
    pedigreeInfo: false,
    picture: null,
    createdAt: "2025-12-01T10:00:00Z"
  },
  {
    id: 2,
    tagId: "SHP-002",
    electronicId: "RFID-0002",
    name: "Kalu",
    animalType: "Sheep",
    breedType: "Kajli",
    subcategory: "Fattening",
    sex: "Male",
    purchasedFrom: "Pakistan",
    arrivalDate: "2025-12-05",
    birthDate: "2024-08-20",
    purchasePrice: 52000,
    weight: 40,
    weightDate: "2025-12-05",
    penId: 1,
    status: "Active",
    pedigreeInfo: true,
    picture: null,
    createdAt: "2025-12-05T11:30:00Z"
  },
  {
    id: 3,
    tagId: "SHP-003",
    electronicId: "RFID-0003",
    name: "Champa",
    animalType: "Sheep",
    breedType: "Beetal",
    subcategory: "Production",
    sex: "Female",
    purchasedFrom: "Pakistan",
    arrivalDate: "2025-11-20",
    birthDate: "2023-03-10",
    purchasePrice: 65000,
    weight: 45,
    weightDate: "2025-11-20",
    penId: 2,
    status: "Active",
    pedigreeInfo: true,
    picture: null,
    createdAt: "2025-11-20T09:15:00Z"
  },
  {
    id: 4,
    tagId: "SHP-004",
    electronicId: "RFID-0004",
    name: "Moti",
    animalType: "Goat",
    breedType: "Teddy",
    subcategory: "Fattening",
    sex: "Male",
    purchasedFrom: "Pakistan",
    arrivalDate: "2025-12-10",
    birthDate: "2024-09-01",
    purchasePrice: 38000,
    weight: 28,
    weightDate: "2025-12-10",
    penId: 3,
    status: "Quarantine",
    pedigreeInfo: false,
    picture: null,
    createdAt: "2025-12-10T14:00:00Z"
  },
  {
    id: 5,
    tagId: "SHP-005",
    electronicId: "RFID-0005",
    name: "Hira",
    animalType: "Sheep",
    breedType: "Dumba",
    subcategory: "Fattening",
    sex: "Female",
    purchasedFrom: "Afghanistan",
    arrivalDate: "2025-12-12",
    birthDate: "2024-04-25",
    purchasePrice: 72000,
    weight: 50,
    weightDate: "2025-12-12",
    penId: 2,
    status: "Active",
    pedigreeInfo: true,
    picture: null,
    createdAt: "2025-12-12T08:45:00Z"
  }
];

export const mockPens = [
  {
    id: 1,
    name: "Pen A - Fattening 1",
    type: "Fattening",
    minWeightAvg: 25,
    maxWeightAvg: 50,
    animalCount: 2,
    capacity: 20,
    createdAt: "2025-11-01T10:00:00Z"
  },
  {
    id: 2,
    name: "Pen B - Production",
    type: "Production",
    minWeightAvg: 40,
    maxWeightAvg: 70,
    animalCount: 2,
    capacity: 15,
    createdAt: "2025-11-01T10:00:00Z"
  },
  {
    id: 3,
    name: "Pen C - Quarantine",
    type: "Quarantine",
    minWeightAvg: 0,
    maxWeightAvg: 100,
    animalCount: 1,
    capacity: 10,
    createdAt: "2025-11-05T12:00:00Z"
  },
  {
    id: 4,
    name: "Pen D - Heifer",
    type: "Heifer",
    minWeightAvg: 30,
    maxWeightAvg: 60,
    animalCount: 0,
    capacity: 12,
    createdAt: "2025-11-10T09:30:00Z"
  }
];

export const mockStocks = [
  {
    id: 1,
    productName: "Wheat Bran",
    category: "Feeding",
    unit: "kg",
    isStockItem: true,
    openingStockQty: 500,
    openingRatePerUnit: 80,
    openingStockAmount: 40000,
    currentQty: 420,
    createdAt: "2025-11-01T10:00:00Z"
  },
  {
    id: 2,
    productName: "Cotton Seed Cake",
    category: "Feeding",
    unit: "kg",
    isStockItem: true,
    openingStockQty: 300,
    openingRatePerUnit: 120,
    openingStockAmount: 36000,
    currentQty: 250,
    createdAt: "2025-11-01T10:00:00Z"
  },
  {
    id: 3,
    productName: "Albendazole",
    category: "Medication",
    unit: "ml",
    isStockItem: true,
    openingStockQty: 1000,
    openingRatePerUnit: 5,
    openingStockAmount: 5000,
    currentQty: 850,
    createdAt: "2025-11-05T12:00:00Z"
  },
  {
    id: 4,
    productName: "Ivermectin",
    category: "Medication",
    unit: "ml",
    isStockItem: true,
    openingStockQty: 500,
    openingRatePerUnit: 15,
    openingStockAmount: 7500,
    currentQty: 480,
    createdAt: "2025-11-05T12:00:00Z"
  },
  {
    id: 5,
    productName: "Mineral Mix",
    category: "Feeding",
    unit: "kg",
    isStockItem: true,
    openingStockQty: 100,
    openingRatePerUnit: 250,
    openingStockAmount: 25000,
    currentQty: 85,
    createdAt: "2025-11-10T09:00:00Z"
  },
  {
    id: 6,
    productName: "Vaccine A",
    category: "Medication",
    unit: "nos",
    isStockItem: true,
    openingStockQty: 200,
    openingRatePerUnit: 50,
    openingStockAmount: 10000,
    currentQty: 175,
    createdAt: "2025-11-12T14:00:00Z"
  }
];

export const mockEmployees = [
  {
    id: 1,
    name: "Muhammad Ali",
    cnic: "35201-1234567-1",
    phone: "0300-1234567",
    email: "ali@example.com",
    address: "House 123, Street 5, Lahore",
    designation: "Farm Manager",
    department: "Operations",
    dateOfJoining: "2024-01-15",
    salary: 75000,
    allowances: 10000,
    bankName: "HBL",
    accountNumber: "1234567890",
    advanceBalance: 0,
    status: "Active",
    createdAt: "2024-01-15T10:00:00Z"
  },
  {
    id: 2,
    name: "Ahmed Khan",
    cnic: "35201-7654321-2",
    phone: "0301-2345678",
    email: "ahmed@example.com",
    address: "House 456, Street 10, Lahore",
    designation: "Veterinarian",
    department: "Health",
    dateOfJoining: "2024-03-01",
    salary: 90000,
    allowances: 15000,
    bankName: "MCB",
    accountNumber: "0987654321",
    advanceBalance: 5000,
    status: "Active",
    createdAt: "2024-03-01T09:00:00Z"
  },
  {
    id: 3,
    name: "Rashid Mehmood",
    cnic: "35201-9876543-3",
    phone: "0302-3456789",
    email: "rashid@example.com",
    address: "House 789, Street 15, Lahore",
    designation: "Farm Worker",
    department: "Operations",
    dateOfJoining: "2024-06-10",
    salary: 35000,
    allowances: 5000,
    bankName: "UBL",
    accountNumber: "5678901234",
    advanceBalance: 10000,
    status: "Active",
    createdAt: "2024-06-10T11:30:00Z"
  },
  {
    id: 4,
    name: "Farhan Saeed",
    cnic: "35201-4567890-4",
    phone: "0303-4567890",
    email: "farhan@example.com",
    address: "House 321, Street 20, Lahore",
    designation: "Accountant",
    department: "Finance",
    dateOfJoining: "2024-02-20",
    salary: 55000,
    allowances: 8000,
    bankName: "Allied Bank",
    accountNumber: "4321098765",
    advanceBalance: 0,
    status: "Active",
    createdAt: "2024-02-20T10:45:00Z"
  },
  {
    id: 5,
    name: "Bilal Hassan",
    cnic: "35201-2345678-5",
    phone: "0304-5678901",
    email: "bilal@example.com",
    address: "House 654, Street 25, Lahore",
    designation: "Farm Worker",
    department: "Operations",
    dateOfJoining: "2024-08-05",
    salary: 32000,
    allowances: 4000,
    bankName: "Bank Alfalah",
    accountNumber: "8765432109",
    advanceBalance: 3000,
    status: "Active",
    createdAt: "2024-08-05T08:00:00Z"
  }
];

export const mockCapital = {
  totalCapital: 2000000,
  investedAmount: 1250000,
  availableAmount: 750000,
  lastUpdated: "2025-12-15T10:00:00Z",
  history: [
    {
      id: 1,
      amount: 2000000,
      type: "Initial Investment",
      date: "2025-11-01",
      description: "Initial capital investment for farm setup"
    },
    {
      id: 2,
      amount: -500000,
      type: "Animal Purchase",
      date: "2025-11-15",
      description: "Purchased 10 sheep for fattening"
    },
    {
      id: 3,
      amount: -200000,
      type: "Infrastructure",
      date: "2025-11-20",
      description: "Pen construction and setup"
    },
    {
      id: 4,
      amount: -150000,
      type: "Stock Purchase",
      date: "2025-12-01",
      description: "Feed and medicine stock"
    },
    {
      id: 5,
      amount: -400000,
      type: "Salaries",
      date: "2025-12-10",
      description: "Staff salaries for 3 months"
    }
  ]
};

export const mockUser = {
  id: 1,
  name: "Admin User",
  email: "admin@sheepfarm.pk",
  role: "Admin",
  farmName: "Green Valley Sheep Farm",
  phone: "0300-1234567",
  createdAt: "2025-01-01T10:00:00Z"
};

// Dropdown options
export const animalTypes = ["Sheep", "Goat"];
export const breedTypes = ["Dumba", "Kajli", "Beetal", "Teddy", "Barbari", "Nachi", "Rakhshani"];
export const animalSubcategories = ["Fattening", "Production", "Breeding", "Heifer"];
export const sexOptions = ["Male", "Female"];
export const countries = ["Pakistan", "Afghanistan", "Iran", "Australia"];
export const animalStatuses = ["Active", "Quarantine", "Sold", "Dead", "Returned", "Slaughtered"];

export const penTypes = ["Fattening", "Production", "Quarantine", "Heifer", "Dry", "Close-up"];

export const stockCategories = ["Feeding", "Medication", "Semen", "Seeds", "Fertilizers", "Pesticides"];
export const stockUnits = ["kg", "gm", "ltr", "ml", "nos"];

export const departments = ["Operations", "Health", "Finance", "Administration"];
export const designations = ["Farm Manager", "Veterinarian", "Farm Worker", "Accountant", "Supervisor", "Security"];
export const banks = ["HBL", "MCB", "UBL", "Allied Bank", "Bank Alfalah", "Meezan Bank", "Faysal Bank"];
