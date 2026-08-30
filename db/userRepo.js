import { supabase } from "./supabase.js";

export async function findUser(
    name,
    password
) {
    const { data, error } = await supabase.rpc(
        "authenticate_qa_employee",
        { p_login: name, p_password: password }
    );

    if (error) {
        console.error(error);
        throw error;
    }

    return data?.[0] || null;
}
