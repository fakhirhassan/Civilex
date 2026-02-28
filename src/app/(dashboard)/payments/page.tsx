"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import PaymentForm from "@/components/features/payments/PaymentForm";
import { usePayments } from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, CreditCard } from "lucide-react";
import type { PaymentWithRelations } from "@/types/payment";

const statusVariants: Record<string, "default" | "success" | "danger" | "warning" | "info"> = {
  pending: "warning",
  processing: "info",
  completed: "success",
  failed: "danger",
  refunded: "default",
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const { payments, isLoading, fetchPayments } = usePayments();
  const [search, setSearch] = useState("");
  const [payingPayment, setPayingPayment] = useState<PaymentWithRelations | null>(null);

  const filtered = payments.filter(
    (p) =>
      (p.case?.case_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.case?.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.transaction_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: "case_number",
      label: "Case",
      render: (item: PaymentWithRelations) => (
        <div>
          <p className="font-medium">{item.case?.case_number || "—"}</p>
          <p className="text-xs text-muted line-clamp-1">
            {item.case?.title || ""}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (item: PaymentWithRelations) => (
        <span className="capitalize text-sm">
          {item.payment_type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "counterparty",
      label: user?.role === "lawyer" ? "Client" : "Lawyer",
      render: (item: PaymentWithRelations) => {
        const person = user?.role === "lawyer" ? item.payer : item.receiver;
        return (
          <span className="text-sm">
            {person?.full_name || "—"}
          </span>
        );
      },
    },
    {
      key: "amount",
      label: "Amount",
      render: (item: PaymentWithRelations) => (
        <div>
          <p className="font-medium">{formatCurrency(item.amount)}</p>
          {item.is_installment && (
            <p className="text-xs text-muted">
              {item.installment_number}/{item.total_installments}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: PaymentWithRelations) => (
        <Badge variant={statusVariants[item.status] || "default"}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (item: PaymentWithRelations) => (
        <span className="text-sm">
          {item.paid_at ? formatDate(item.paid_at) : formatDate(item.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: PaymentWithRelations) => (
        <div className="flex gap-2">
          {item.status === "pending" && user?.id === item.payer_id && (
            <Button
              size="sm"
              onClick={() => setPayingPayment(item)}
            >
              Pay Now
            </Button>
          )}
          {item.transaction_id && (
            <span className="text-xs text-muted">
              {item.transaction_id}
            </span>
          )}
        </div>
      ),
    },
  ];

  // Summary stats
  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <Topbar title="Payments" />

      <div className="p-6">
        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-cream-light p-4">
            <p className="text-sm text-muted">Total Paid</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-cream-light p-4">
            <p className="text-sm text-muted">Pending</p>
            <p className="text-2xl font-bold text-warning">
              {formatCurrency(totalPending)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-cream-light p-4">
            <p className="text-sm text-muted">Total Transactions</p>
            <p className="text-2xl font-bold text-foreground">
              {payments.length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search by case number or transaction ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 && !search ? (
          <EmptyState
            title="No payments yet"
            description="Payment records will appear here when cases are accepted by lawyers."
            icon={<CreditCard className="h-12 w-12" />}
          />
        ) : (
          <Table
            columns={columns}
            data={filtered}
            keyExtractor={(item) => item.id}
            emptyMessage="No payments match your search."
          />
        )}
      </div>

      {/* Payment Modal */}
      {payingPayment && (
        <PaymentForm
          payment={payingPayment}
          isOpen={!!payingPayment}
          onClose={() => setPayingPayment(null)}
          onSuccess={() => {
            setPayingPayment(null);
            fetchPayments();
          }}
        />
      )}
    </div>
  );
}
