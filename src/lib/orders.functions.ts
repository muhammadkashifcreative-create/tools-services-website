import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, link, quantity, charge, status, provider_order_id, start_count, remains, created_at, services(name, platform)")
      .order("created_at", { ascending: false })
      .limit(100);
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

    // Debit balance + insert order + transaction (admin client for atomic writes)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newBalance = +(balance - charge).toFixed(4);
    await supabaseAdmin.from("profiles").update({ balance: newBalance }).eq("id", userId);
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

    return { orderId: order.id, charge, discount, newBalance };
  });

export const refreshOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("id, provider_order_id, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || !order.provider_order_id) throw new Error("Order not found");

    const { orderStatus } = await import("./famousprovider.server");
    const status = await orderStatus(order.provider_order_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({
        status: status.status?.toLowerCase() ?? "processing",
        start_count: status.start_count ? Number(status.start_count) : null,
        remains: status.remains ? Number(status.remains) : null,
      })
      .eq("id", order.id);

    return { status: status.status, remains: status.remains, start_count: status.start_count };
  });