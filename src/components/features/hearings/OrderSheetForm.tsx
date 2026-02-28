"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ORDER_TYPE_LABELS } from "@/types/hearing";
import type { OrderSheet, OrderType } from "@/types/hearing";
import { formatDateTime } from "@/lib/utils";
import { ScrollText, AlertCircle, Plus } from "lucide-react";

interface OrderSheetFormProps {
  hearingId?: string;
  existingOrders?: OrderSheet[];
  isReadOnly?: boolean;
  onSubmit: (data: {
    hearing_id?: string;
    order_type: OrderType;
    order_text: string;
  }) => Promise<{ error: string | null }>;
}

export default function OrderSheetForm({
  hearingId,
  existingOrders = [],
  isReadOnly = false,
  onSubmit,
}: OrderSheetFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("interim");
  const [orderText, setOrderText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!orderText.trim()) {
      setError("Order text cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await onSubmit({
      hearing_id: hearingId,
      order_type: orderType,
      order_text: orderText.trim(),
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setOrderText("");
      setShowForm(false);
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-base font-semibold text-primary">
          <ScrollText className="mr-2 inline h-4 w-4" />
          Order Sheets
        </h4>
        {!isReadOnly && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        )}
      </div>

      {/* Existing orders */}
      {existingOrders.length > 0 && (
        <div className="mb-4 space-y-3">
          {existingOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <Badge variant="primary">
                  {ORDER_TYPE_LABELS[order.order_type]}
                </Badge>
                <span className="text-xs text-muted">
                  {formatDateTime(order.created_at)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {order.order_text}
              </p>
              {order.issuer && (
                <p className="mt-2 text-xs text-muted">
                  Issued by: {order.issuer.full_name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {existingOrders.length === 0 && !showForm && (
        <p className="text-sm text-muted">No orders issued yet.</p>
      )}

      {/* New order form */}
      {showForm && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Order Type
            </label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType)}
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Order Text
            </label>
            <textarea
              value={orderText}
              onChange={(e) => setOrderText(e.target.value)}
              rows={5}
              placeholder="Write the order text..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
              Issue Order
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
