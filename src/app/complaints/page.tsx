"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  X,
  Download,
  Calendar,
  UserCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react"
import Link from "next/link"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "react-hot-toast"

interface Complaint {
  id: string
  complaintNumber: string
  customerName: string
  customerId: string
  policyNumber: string
  policyType: string
  description: string
  channel: string
  createdAt: string
  dueDate: string | null
  status: {
    id: string
    name: string
  }
  type: {
    id: string
    name: string
  }
  branch: {
    id: string
    name: string
  }
  lineOfBusiness: {
    id: string
    name: string
  }
  assignedTo: {
    id: string
    name: string
  } | null
  createdBy: {
    id: string
    name: string
  }
}

interface FilterOptions {
  status: string
  type: string
  branch: string
  lineOfBusiness: string
  assignedTo: string
  dateFrom: string
  dateTo: string
  channel: string
  slaStatus: "all" | "onTrack" | "dueSoon" | "overdue"
}

interface PaginationState {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export default function ComplaintsPage() {
  const { data: session } = useSession()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([])
  const [displayedComplaints, setDisplayedComplaints] = useState<Complaint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filters, setFilters] = useState<FilterOptions>({
    status: "all",
    type: "all",
    branch: "all",
    lineOfBusiness: "all",
    assignedTo: "all",
    dateFrom: "",
    dateTo: "",
    channel: "all",
    slaStatus: "all"
  })
  const [filterOptions, setFilterOptions] = useState({
    statuses: [] as { id: string; name: string }[],
    types: [] as { id: string; name: string }[],
    branches: [] as { id: string; name: string }[],
    linesOfBusiness: [] as { id: string; name: string }[],
    users: [] as { id: string; name: string }[]
  })
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  })

  // Refresh data when page gains focus
  useEffect(() => {
    const handleFocus = () => setRefreshKey(prev => prev + 1)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [complaintsRes, statusesRes, typesRes, branchesRes, lobRes, usersRes] = await Promise.all([
          fetch("/api/complaints"),
          fetch("/api/complaint-statuses"),
          fetch("/api/complaint-types"),
          fetch("/api/branches"),
          fetch("/api/line-of-business"),
          fetch("/api/users")
        ])

        // Safely handle complaints
        if (complaintsRes.ok) {
          const complaintsData = await complaintsRes.json()
          if (Array.isArray(complaintsData)) {
            setComplaints(complaintsData)
            setFilteredComplaints(complaintsData)
            setPagination(prev => ({
              ...prev,
              totalItems: complaintsData.length,
              totalPages: Math.ceil(complaintsData.length / prev.pageSize)
            }))
          } else {
            setComplaints([])
            setFilteredComplaints([])
            toast.error("Invalid complaints data")
          }
        } else {
          toast.error("Failed to fetch complaints")
        }

        // Set filter options safely
        const setOptionSafe = async (res: Response, key: keyof typeof filterOptions) => {
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data)) setFilterOptions(prev => ({ ...prev, [key]: data }))
          }
        }

        await Promise.all([
          setOptionSafe(statusesRes, "statuses"),
          setOptionSafe(typesRes, "types"),
          setOptionSafe(branchesRes, "branches"),
          setOptionSafe(lobRes, "linesOfBusiness"),
          (async () => {
            if (usersRes.ok) {
              const data = await usersRes.json()
              if (Array.isArray(data)) {
                const validUsers = data.filter(user => user?.id?.trim())
                setFilterOptions(prev => ({ ...prev, users: validUsers }))
              }
            }
          })()
        ])
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast.error("Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }

    if (session) fetchData()
  }, [session, refreshKey])

  // Apply search and filters
  useEffect(() => {
    let result = Array.isArray(complaints) ? complaints : []

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(c =>
        (c.complaintNumber || "").toLowerCase().includes(term) ||
        (c.customerName || "").toLowerCase().includes(term) ||
        (c.customerId || "").toLowerCase().includes(term) ||
        (c.policyNumber || "").toLowerCase().includes(term) ||
        (c.description || "").toLowerCase().includes(term) ||
        ((c.createdBy?.name || "").toLowerCase().includes(term))
      )
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter(c => c.status?.id === filters.status)
    }
    if (filters.type && filters.type !== "all") {
      result = result.filter(c => c.type?.id === filters.type)
    }
    if (filters.branch && filters.branch !== "all") {
      result = result.filter(c => c.branch?.id === filters.branch)
    }
    if (filters.lineOfBusiness && filters.lineOfBusiness !== "all") {
      result = result.filter(c => c.lineOfBusiness?.id === filters.lineOfBusiness)
    }
    if (filters.assignedTo && filters.assignedTo !== "all") {
      result = result.filter(c => c.assignedTo?.id === filters.assignedTo)
    }
    if (filters.channel && filters.channel !== "all") {
      result = result.filter(c => c.channel === filters.channel)
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      result = result.filter(c => new Date(c.createdAt) >= fromDate)
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23,59,59,999)
      result = result.filter(c => new Date(c.createdAt) <= toDate)
    }
    if (filters.slaStatus !== "all") {
      const now = new Date()
      result = result.filter(c => {
        if (!c.dueDate) return false
        const due = new Date(c.dueDate)
        const diffHrs = (due.getTime() - now.getTime()) / (1000*60*60)
        if (filters.slaStatus === "onTrack") return diffHrs >= 24
        if (filters.slaStatus === "dueSoon") return diffHrs >= 0 && diffHrs < 24
        if (filters.slaStatus === "overdue") return diffHrs < 0
        return true
      })
    }

    setFilteredComplaints(result)
    setPagination(prev => ({
      ...prev,
      currentPage: 1,
      totalItems: result.length,
      totalPages: Math.ceil(result.length / prev.pageSize)
    }))
  }, [searchTerm, filters, complaints])

  // Pagination slice safely
  useEffect(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    setDisplayedComplaints(Array.isArray(filteredComplaints) ? filteredComplaints.slice(startIndex, endIndex) : [])
  }, [filteredComplaints, pagination.currentPage, pagination.pageSize])

  const handleFilterChange = (name: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const clearFilters = () => setFilters({
    status: "all",
    type: "all",
    branch: "all",
    lineOfBusiness: "all",
    assignedTo: "all",
    dateFrom: "",
    dateTo: "",
    channel: "all",
    slaStatus: "all"
  })

  const hasActiveFilters = Object.values(filters).some(v => v !== "" && v !== "all")

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  const handlePageSizeChange = (size: number) => {
    setPagination(prev => ({
      ...prev,
      pageSize: size,
      currentPage: 1,
      totalPages: Math.ceil(prev.totalItems / size)
    }))
  }

  const exportToCSV = () => {
    if (!Array.isArray(filteredComplaints)) return
    const headers = [
      "Complaint #","Customer Name","Customer ID","Policy Number","Policy Type",
      "Type","Status","Channel","Branch","Line of Business","Assigned To","Created By","Created Date","Due Date"
    ]

    const csvContent = [
      '\uFEFF' + headers.join(","),
      ...filteredComplaints.map(c => [
        c.complaintNumber || "",
        `"${c.customerName || ""}"`,
        c.customerId || "",
        c.policyNumber || "",
        `"${c.policyType || ""}"`,
        c.type?.name || "",
        c.status?.name || "",
        c.channel || "",
        c.branch?.name || "",
        c.lineOfBusiness?.name || "",
        c.assignedTo?.name || "Unassigned",
        c.createdBy?.name || "",
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
        c.dueDate ? new Date(c.dueDate).toLocaleDateString() : ""
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "complaints.csv"
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV exported successfully with Arabic support")
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    toast.success("Complaints refreshed")
  }

  const getStatusBadge = (statusName?: string) => {
    switch(statusName) {
      case "PENDING": return <Badge variant="secondary">Pending</Badge>
      case "IN_PROGRESS": return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
      case "RESOLVED": return <Badge className="bg-green-100 text-green-800">Resolved</Badge>
      case "CLOSED": return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
      default: return <Badge variant="outline">{statusName || "N/A"}</Badge>
    }
  }

  const getSLAStatus = (dueDate?: string | null) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const now = new Date()
    const diffHrs = (due.getTime() - now.getTime()) / (1000*60*60)
    if (diffHrs < 0) return <div className="flex items-center text-red-600"><AlertTriangle className="h-4 w-4 mr-1" /><span className="text-xs">Overdue</span></div>
    if (diffHrs < 24) return <div className="flex items-center text-yellow-600"><Clock className="h-4 w-4 mr-1" /><span className="text-xs">Due soon</span></div>
    return <div className="flex items-center text-green-600"><CheckCircle className="h-4 w-4 mr-1" /><span className="text-xs">On track</span></div>
  }

  const getPageNumbers = () => {
    const pages: (number|string)[] = []
    const { currentPage, totalPages } = pagination
    if (totalPages <= 7) {
      for(let i=1;i<=totalPages;i++) pages.push(i)
    } else {
      if(currentPage <= 4) {
        for(let i=1;i<=5;i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if(currentPage >= totalPages-3) {
        pages.push(1)
        pages.push('...')
        for(let i=totalPages-4;i<=totalPages;i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for(let i=currentPage-1;i<=currentPage+1;i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }
    return pages
  }

  if (!session) return null

  return (
    <DashboardLayout>
      {/* ... The rest of your JSX stays the same ... */}
      {/* All table rendering and UI code is unchanged, just ensure you pass safe data */}
    </DashboardLayout>
  )
}
