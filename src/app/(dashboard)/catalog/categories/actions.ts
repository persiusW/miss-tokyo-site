"use server";

import { createClient } from "@/lib/supabaseServer";
import { logActivity } from "@/lib/utils/logActivity";
import { revalidatePath } from "next/cache";

export async function createCategory(data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile) return { success: false, error: "Profile not found" };

    const { data: newCat, error } = await supabase.from("categories").insert([data]).select("id, name").single();
    if (error) return { success: false, error: error.message };

    await logActivity({
        userId: user.id,
        userRole: profile.role,
        actionType: "CREATE",
        resource: "category",
        resourceId: newCat.id,
        newData: data
    });

    revalidatePath("/catalog/categories");
    return { success: true, category: newCat };
}

export async function updateCategory(id: string, data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile) return { success: false, error: "Profile not found" };

    // Fetch old record for diffing
    const { data: oldData } = await supabase.from("categories").select("*").eq("id", id).single();

    const { error } = await supabase.from("categories").update(data).eq("id", id);
    if (error) return { success: false, error: error.message };

    await logActivity({
        userId: user.id,
        userRole: profile.role,
        actionType: "UPDATE",
        resource: "category",
        resourceId: id,
        oldData,
        newData: data
    });

    revalidatePath("/catalog/categories");
    return { success: true };
}

export async function deleteCategory(id: string, name: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile) return { success: false, error: "Profile not found" };

    const { data: oldData } = await supabase.from("categories").select("*").eq("id", id).single();

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    await logActivity({
        userId: user.id,
        userRole: profile.role,
        actionType: "DELETE",
        resource: "category",
        resourceId: id,
        oldData
    });

    revalidatePath("/catalog/categories");
    return { success: true };
}
