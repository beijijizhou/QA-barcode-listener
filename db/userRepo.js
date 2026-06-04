import { supabase } from "./supabase.js";

export async function findUser(
    name,
    password
) {
    const { data, error } =
        await supabase
            .from('users')
            .select('*')
            .eq('name', name)
            .eq('password', password)
            .maybeSingle();

    if (error) {
        console.error(error);
        throw error;
    }

    return data;
}