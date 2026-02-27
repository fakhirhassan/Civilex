import Topbar from "@/components/layout/Topbar";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Search } from "lucide-react";

// Mock data - will be replaced with Supabase queries in Phase 3
const mockPayments = [
  {
    id: "1",
    case_number: "#0001",
    lawyer: "Lawyer",
    amount: "20,000",
    status: "paid",
    date: "25-Aug-2025",
  },
  {
    id: "2",
    case_number: "#0001",
    lawyer: "Lawyer",
    amount: "20,000",
    status: "unpaid",
    date: "25-Aug-2025",
  },
];

const columns = [
  { key: "case_number", label: "Case ID" },
  { key: "lawyer", label: "Lawyer" },
  { key: "amount", label: "Amount" },
  {
    key: "status",
    label: "Status",
    render: (item: (typeof mockPayments)[0]) => (
      <Badge variant={item.status === "paid" ? "success" : "danger"}>
        {item.status === "paid" ? "Paid" : "Unpaid"}
      </Badge>
    ),
  },
  { key: "date", label: "Date" },
  {
    key: "actions",
    label: "Actions",
    render: (item: (typeof mockPayments)[0]) => (
      <div className="flex gap-2">
        <Button size="sm" variant="outline">
          View
        </Button>
        {item.status === "unpaid" && (
          <Button size="sm" variant="primary">
            Pay Now
          </Button>
        )}
      </div>
    ),
  },
];

export default function PaymentsPage() {
  return (
    <div>
      <Topbar title="Payments" />

      <div className="p-6">
        {/* Search */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Search Transaction" className="pl-10" />
          </div>
        </div>

        {/* Payments table */}
        <Table
          columns={columns}
          data={mockPayments}
          keyExtractor={(item) => item.id}
          emptyMessage="No payment records found."
        />
      </div>
    </div>
  );
}
