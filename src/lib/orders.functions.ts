import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireDirectAuth as requireSupabaseAuth } from "@/lib/direct-auth-middleware.server";
import { deltaBalance } from "@/lib/balance.server";

const ACTIVE_STATUSES = ["processing", "pending", "in progress"];
const CANCELLED_STATUSES = ["canceled", "cancelled"];

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, link, quantity, charge, status, provider_order_id, start_count, remains, created_at, services(name, platform)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      serviceId: z.string().uuid(),
      link: z.string().trim().url().max(500),
      quantity: z.number().int().positive().max(10_000_000),
      coupon: z.string().trim().max(32).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: service, error: sErr } = await supabase
      .from("services")
      .select("id, provider_service_id, rate, min_quantity, max_quantity, name")
      .eq("id", data.serviceId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!service) throw new Error("Service not found");
    if (data.quantity < service.min_quantity || data.quantity > service.max_quantity) {
      throw new Error(`Quantity must be between ${service.min_quantity} and ${service.max_quantity}`);
    }

    let charge = +(Number(service.rate) * data.quantity / 1000).toFixed(4);

    // Coupon (welcome 5% off). Extend here with DB-backed codes if needed.
    let discount = 0;
    const code = data.coupon?.toUpperCase();
    if (code === "WELCOME5") {
      discount = +(charge * 0.05).toFixed(4);
      charge = +(charge - discount).toFixed(4);
    } else if (code) {
      throw new Error("Invalid coupon code");
    }

    // Check balance before touching anything
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const balance = Number(profile?.balance ?? 0);
    if (balance < charge) throw new Error(`Insufficient balance. Need $${charge.toFixed(2)}, have $${balance.toFixed(2)}`);

    // Submit to provider
    const { placeOrder: providerPlace } = await import("./famousprovider.server");
    const providerRes = await providerPlace({
      service: service.provider_service_id,
      link: data.link,
      quantity: data.quantity,
    });
    const providerOrderId = String(providerRes.order);

    // Atomically debit balance
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newBalance = await deltaBalance(userId, -charge);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        service_id: data.serviceId,
        link: data.link,
        quantity: data.quantity,
        charge,
        status: "processing",
        provider_order_id: providerOrderId,
      })
      .select("id")
      .single();
    if (oErr) throw new Error(oErr.message);

    await supabaseAdmin.from("transactions").insert({
      user_id: userId,
      amount: -charge,
      type: "order",
      description: `Order for ${service.name}`,
      reference_id: order.id,
    });

    // Send order confirmation email (non-blocking)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const toEmail = authUser?.user?.email;
    if (toEmail) {
      const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      import("@/lib/email.server").then(({ sendOrderConfirmationEmail }) => {
        sendOrderConfirmationEmail(toEmail, prof?.full_name ?? "", order.id, service.name, data.quantity, charge, data.link).catch(console.error);
      });
    }

    return { orderId: order.id, charge, discount, newBalance };
  });

export const refreshOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id, provider_order_id, user_id, charge, status, services(name)")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || !order.provider_order_id) throw new Error("Order not found");

    const { orderStatus } = await import("./famousprovider.server");
    const status = await orderStatus(order.provider_order_id);
    const newStatus = status.status?.toLowerCase() ?? "processing";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({
        status: newStatus,
        start_count: status.start_count != null ? Number(status.start_count) : null,
        remains: status.remains != null ? Number(status.remains) : null,
      })
      .eq("id", order.id);

    // Refund if the order was just cancelled from an active state
    let refunded = false;
    if (CANCELLED_STATUSES.includes(newStatus) && ACTIVE_STATUSES.includes(order.status ?? "")) {
      const charge = Number(order.charge);
      if (charge > 0) {
        const newBalance = await deltaBalance(context.userId, charge);
        await supabaseAdmin.from("transactions").insert({
          user_id: context.userId,
          amount: charge,
          type: "refund",
          description: `Refund for cancelled order`,
          reference_id: order.id,
        });

        // Send cancellation email (non-blocking)
        const serviceName = (order.services as { name: string } | null)?.name ?? "Unknown Service";
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(context.userId);
        const toEmail = authUser?.user?.email;
        if (toEmail) {
          const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
          import("@/lib/email.server").then(({ sendOrderCancelledEmail }) => {
            sendOrderCancelledEmail(toEmail, prof?.full_name ?? "", order.id, serviceName, charge, newBalance).catch(console.error);
          });
        }

        refunded = true;
      }
    }

    return { status: status.status, remains: status.remains, start_count: status.start_count, refunded };
  });

export const syncMyActiveOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: activeOrders, error } = await supabase
      .from("orders")
      .select("id, provider_order_id, charge, status, services(name)")
      .eq("user_id", userId)
      .in("status", ACTIVE_STATUSES)
      .not("provider_order_id", "is", null);

    if (error) throw new Error(error.message);
    if (!activeOrders?.length) return { synced: 0, refunded: 0 };

    const { orderStatus } = await import("./famousprovider.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch all statuses from provider in parallel
    const results = await Promise.allSettled(
      activeOrders.map(async (order) => {
        const status = await orderStatus(order.provider_order_id!);
        return { order, status };
      })
    );

    let synced = 0;
    const cancellations: Array<{ orderId: string; charge: number; serviceName: string }> = [];

    // Process sequentially to keep the cancellations list accurate for the batch refund
    for (const result of results) {
      if (result.status === "rejected") continue;
      const { order, status } = result.value;
      const newStatus = status.status?.toLowerCase() ?? order.status;

      if (newStatus === order.status) continue;

      // Only update if still active — prevents double-processing on concurrent calls
      const { data: updated } = await supabaseAdmin
        .from("orders")
        .update({
          status: newStatus,
          start_count: status.start_count != null ? Number(status.start_count) : undefined,
          remains: status.remains != null ? Number(status.remains) : undefined,
        })
        .eq("id", order.id)
        .in("status", ACTIVE_STATUSES)
        .select("id")
        .maybeSingle();

      if (!updated) continue;
      synced++;

      if (CANCELLED_STATUSES.includes(newStatus)) {
        const charge = Number(order.charge);
        const serviceName = (order.services as { name: string } | null)?.name ?? "Unknown Service";
        if (charge > 0) cancellations.push({ orderId: order.id, charge, serviceName });
      }
    }

    // Apply all refunds as a single atomic balance delta
    if (cancellations.length > 0) {
      const totalRefund = cancellations.reduce((s, c) => s + c.charge, 0);
      const newBalance = await deltaBalance(userId, totalRefund);

      await supabaseAdmin.from("transactions").insert(
        cancellations.map((c) => ({
          user_id: userId,
          amount: c.charge,
          type: "refund",
          description: `Refund for cancelled order`,
          reference_id: c.orderId,
        }))
      );

      // Send cancellation emails (non-blocking) — fetch user info once for all emails
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const toEmail = authUser?.user?.email;
      if (toEmail) {
        const { data: prof } = await supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
        import("@/lib/email.server").then(({ sendOrderCancelledEmail }) => {
          for (const c of cancellations) {
            sendOrderCancelledEmail(toEmail, prof?.full_name ?? "", c.orderId, c.serviceName, c.charge, newBalance).catch(console.error);
          }
        });
      }
    }

    return { synced, refunded: cancellations.length };
  });
