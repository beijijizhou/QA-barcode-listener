import { supabase } from "./supabase.js";

export async function findUser(
    name,
    password
) {
    console.log(name,password)
    const { data, error } =
        await supabase
            .from('users')
            .select('*')
            .or(`name.eq.${name},user_name.eq.${name}`)
            .eq('password', password)
            .maybeSingle();

    if (error) {
        console.error(error);
        throw error;
    }

    return data;
}



